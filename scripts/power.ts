// Offline power check: 1,000 reruns, no network. Answers four questions with the decision rule of plan 3.8:
//   1. Power at the MDE (+15% and +18% relative on a 35% baseline, 1,500 identities per arm).
//   2. False positive rate under A/A (nobody should "win" more often than the nominal rate).
//   3. Does the harm world get refused (guardrail losing) and the MDE world shipped?
//   4. SRM detection in the SRM world (10% of fix_first exposures dropped).
// Run: pnpm power [-- --reruns 1000 --n 3000 --seed 2026 --draws 2000 --srm-alpha 0.01 --drop 0.1]
// Our own Beta-Binomial reading, not Flagsmith's results. The simulation says nothing about developers.
import { decide, loadThresholds, type Outcome, type Thresholds } from './expected-loss.ts'
import { simulateWorld, worldParams, type Summary, type World } from './sim/model.ts'
import { mulberry32 } from './sim/prng.ts'
import { binomial, compare, srmPValue } from './stats/beta.ts'

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? Number(process.argv[i + 1]) : fallback
}

const RERUNS = arg('reruns', 1000)
const N_TOTAL = arg('n', 3000)
const SEED = arg('seed', 2026)
const DRAWS = arg('draws', 2000)
const SRM_ALPHA = arg('srm-alpha', 0.01)
const SRM_DROP = arg('drop', 0.1)
const BASELINE = 0.35
const PER_ARM = N_TOTAL / 2
const t: Thresholds = loadThresholds()
const pct = (x: number) => `${(100 * x).toFixed(1)}%`

interface Tally {
  beat95: number
  win: number
  lose: number
  outcomes: Record<Outcome, number>
}
const newTally = (): Tally => ({ beat95: 0, win: 0, lose: 0, outcomes: { void: 0, below_minimum: 0, lose: 0, win: 0, inconclusive: 0 } })

/** Primary-only binomial check at a true relative lift (no guardrail, so the win clause is evaluated on the primary alone). */
function binomialScenario(lift: number, salt: number): Tally {
  const rand = mulberry32(SEED + salt)
  const tally = newTally()
  for (let r = 0; r < RERUNS; r++) {
    const control = { n: PER_ARM, conversions: binomial(PER_ARM, BASELINE, rand) }
    const variant = { n: PER_ARM, conversions: binomial(PER_ARM, BASELINE * (1 + lift), rand) }
    const c = compare(control, variant, rand, DRAWS)
    if (c.chanceToBeat > t.chanceToBeatWin) tally.beat95++
    if (c.chanceToBeat < t.chanceToBeatLose) tally.lose++
    if (c.chanceToBeat > t.chanceToBeatWin && c.ci95[0] > 0 && c.expectedLoss * 100 < t.expectedLossMaxPoints) tally.win++
  }
  return tally
}

interface WorldResult {
  tally: Tally
  srm: Record<string, number>
  meanCleanLift: number
  meanGuardDiffPoints: number
}

/** Full rule on a behavioural-model world: counts in, rule out, per rerun. */
function worldScenario(world: World, salt: number): WorldResult {
  const rand = mulberry32(SEED + salt)
  const tally = newTally()
  const srm: Record<string, number> = { '0.05': 0, '0.01': 0, '0.001': 0 }
  let lift = 0
  let guard = 0
  for (let r = 0; r < RERUNS; r++) {
    const params = worldParams(world)
    if (world === 'srm') params.dropFixFirstExposure = SRM_DROP
    const s: Summary = simulateWorld(world, SEED * 1000 + salt * 100_000 + r, N_TOTAL, params)
    const c = s.explain_first
    const v = s.fix_first
    const p = srmPValue(c.exposures, v.exposures)
    for (const a of Object.keys(srm)) if (p < Number(a)) srm[a]++
    const d = decide(
      {
        control: { n: c.exposures, conversions: c.finding_fixed_clean },
        variant: { n: v.exposures, conversions: v.finding_fixed_clean },
        guardControl: c.new_finding_after_edit,
        guardVariant: v.new_finding_after_edit,
        srmWarning: p < SRM_ALPHA,
      },
      rand,
      t,
      DRAWS,
    )
    tally.outcomes[d.outcome]++
    if (d.primary.chanceToBeat > t.chanceToBeatWin) tally.beat95++
    lift += d.rates.control > 0 ? d.rates.variant / d.rates.control - 1 : 0
    guard += d.guardrail.diffPoints
  }
  return { tally, srm, meanCleanLift: lift / RERUNS, meanGuardDiffPoints: guard / RERUNS }
}

const t0 = Date.now()
console.log(`power.ts: ${RERUNS} offline reruns, ${N_TOTAL} identities per rerun (${PER_ARM} per arm), seed=${SEED}, ${DRAWS} posterior draws per comparison, baseline ${pct(BASELINE)}`)
console.log(`Rule thresholds: P(beat) > ${t.chanceToBeatWin}, 95% CrI excludes 0, expected loss < ${t.expectedLossMaxPoints} pts, guardrail harm > ${t.guardrailHarmPoints} pts. SRM alpha used by the rule: ${SRM_ALPHA}.`)
console.log("Our own Beta-Binomial reading, not Flagsmith's number. The simulation says nothing about developers.\n")

console.log('1. Power at the MDE (binomial counts, primary only)')
for (const [label, lift, salt] of [['+15% relative (the MDE)', 0.15, 1], ['+18% relative (the MDE world)', 0.18, 2]] as const) {
  const x = binomialScenario(lift, salt)
  console.log(`   ${label}: P(beat) > 95% in ${pct(x.beat95 / RERUNS)} of reruns; full primary win clause (P>95%, CrI excl 0, expected loss < 0.5 pts) in ${pct(x.win / RERUNS)}`)
}

console.log('\n2. A/A false positive rate (binomial, no real effect)')
const aaBin = binomialScenario(0, 3)
console.log(`   P(beat) > 95%: ${pct(aaBin.beat95 / RERUNS)}   P(beat) < 5%: ${pct(aaBin.lose / RERUNS)}   primary win clause: ${pct(aaBin.win / RERUNS)}`)

const results: Record<string, WorldResult> = {}
console.log('\n3. Behavioural-model worlds, full decision rule per rerun')
for (const [world, salt] of [['aa', 4], ['mde', 5], ['harm', 6], ['srm', 7]] as const) {
  const w = worldScenario(world, salt)
  results[world] = w
  const o = w.tally.outcomes
  const row = (Object.keys(o) as Outcome[]).filter((k) => o[k] > 0).map((k) => `${k} ${pct(o[k] / RERUNS)}`).join(', ')
  console.log(`   ${world.padEnd(4)} mean clean-fix lift ${(100 * w.meanCleanLift).toFixed(1)}%, mean guardrail diff ${w.meanGuardDiffPoints.toFixed(2)} pts, P(beat)>95% ${pct(w.tally.beat95 / RERUNS)} | rule: ${row}`)
}

console.log(`\n4. SRM detection (chi-square on exposure counts vs 50/50; SRM world drops ${pct(SRM_DROP)} of fix_first exposures)`)
for (const world of ['aa', 'srm'] as const) {
  const s = results[world].srm
  console.log(`   ${world.padEnd(4)} flagged at p<0.05: ${pct(s['0.05'] / RERUNS)}   p<0.01: ${pct(s['0.01'] / RERUNS)}   p<0.001: ${pct(s['0.001'] / RERUNS)}`)
}
console.log("   Flagsmith's own SRM threshold is not known here; if it is strict (p<0.001), a 10% drop at 1,500 per arm is detected only about 3 times in 10 (try --drop 0.2; see ASSUMPTIONS.md).")
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
