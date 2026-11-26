// Our own Beta-Binomial reading plus the decision rule of EXPERIMENT.md section 8 / plan 3.8. Offline, no network.
// This is NOT Flagsmith's number: Flagsmith computes its own Bayesian results. Use it to cross-check them and to
// report a reading when Flagsmith shows "Collecting data".
//
// Run: pnpm expected-loss -- --control-n 1500 --control-conv 520 --variant-n 1500 --variant-conv 620 \
//        --guard-control 13 --guard-variant 25 [--srm-warning] [--quarantine-pct 0] [--code-changed] \
//        [--flagsmith-guardrail-losing] [--seed 1] [--draws 100000]
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { compare, srmPValue, type ArmCounts, type Comparison } from './stats/beta.ts'
import { mulberry32 } from './sim/prng.ts'

export interface Thresholds {
  expectedLossMaxPoints: number
  chanceToBeatWin: number
  chanceToBeatLose: number
  guardrailHarmPoints: number
  guardrailMinEventsPerArm: number
  identitiesPerArm: number
  conversionsPerArm: number
  quarantineMaxShare: number
}

export function loadThresholds(): Thresholds {
  const cfg = JSON.parse(readFileSync(new URL('../experiment.config.json', import.meta.url), 'utf8')) as {
    ship: Omit<Thresholds, 'identitiesPerArm' | 'conversionsPerArm' | 'quarantineMaxShare'>
    flagsmithFloor: { identitiesPerArm: number; conversionsPerArm: number }
  }
  return { ...cfg.ship, identitiesPerArm: cfg.flagsmithFloor.identitiesPerArm, conversionsPerArm: cfg.flagsmithFloor.conversionsPerArm, quarantineMaxShare: 0.05 }
}

export interface DecisionInput {
  /** Primary metric (finding_fixed_clean): exposed identities and conversions per arm. */
  control: ArmCounts
  variant: ArmCounts
  /** Guardrail (new_finding_after_edit): event counts per arm, same denominators as the primary. */
  guardControl: number
  guardVariant: number
  /** Flagsmith shows an SRM warning. */
  srmWarning?: boolean
  /** Share of exposed identities in quarantine (0.05 = 5%). */
  quarantineShare?: number
  /** Layouts, exposure or metric code changed after the experiment started. */
  codeChangedAfterStart?: boolean
  /** Flagsmith marks the guardrail as losing. */
  flagsmithGuardrailLosing?: boolean
}

export type Outcome = 'void' | 'below_minimum' | 'lose' | 'win' | 'inconclusive'

export interface Decision {
  rule: 1 | 2 | 3 | 4 | 5
  outcome: Outcome
  /** Action through the `finding_style` flag. */
  action: string
  reasons: string[]
  primary: Comparison
  /** Primary conversion rates, in rate units. */
  rates: { control: number; variant: number }
  guardrail: { control: number; variant: number; diffPoints: number; chanceWorse: number; measured: boolean; losing: boolean }
  expectedLossPoints: number
}

const ACTIONS: Record<Outcome, string> = {
  void: 'Results void. Keep explain_first. Fix the bug and start a new experiment.',
  below_minimum: 'Inconclusive, did not ship. Report raw exposures and conversions per arm and this Beta-Binomial reading (not Flagsmith\'s number). Keep running.',
  lose: 'Complete the experiment with rollout_decision = control. Delete the fix-first layout code.',
  win: 'Complete the experiment with rollout_decision = variant (fix-first). Keep the flag 7 days as a rollback switch, then remove the losing code path.',
  inconclusive: 'Do not ship. Keep explain_first and keep running. Publish the expected loss of shipping now.',
}

/** Apply the five rules top to bottom, first match wins. `rand` makes the Monte Carlo reproducible. */
export function decide(input: DecisionInput, rand: () => number, t: Thresholds = loadThresholds(), draws = 40_000): Decision {
  const { control, variant } = input
  const primary = compare(control, variant, rand, draws)
  const rc = control.n > 0 ? control.conversions / control.n : 0
  const rv = variant.n > 0 ? variant.conversions / variant.n : 0
  const gc = control.n > 0 ? input.guardControl / control.n : 0
  const gv = variant.n > 0 ? input.guardVariant / variant.n : 0
  const guard = compare({ n: control.n, conversions: input.guardControl }, { n: variant.n, conversions: input.guardVariant }, rand, draws)
  const guardDiffPoints = (gv - gc) * 100
  const guardMeasured = input.guardControl >= t.guardrailMinEventsPerArm && input.guardVariant >= t.guardrailMinEventsPerArm
  const guardLosing = Boolean(input.flagsmithGuardrailLosing) || guardDiffPoints > t.guardrailHarmPoints
  const expectedLossPoints = primary.expectedLoss * 100
  const base = {
    primary,
    rates: { control: rc, variant: rv },
    guardrail: { control: gc, variant: gv, diffPoints: guardDiffPoints, chanceWorse: guard.chanceToBeat, measured: guardMeasured, losing: guardLosing },
    expectedLossPoints,
  }
  const done = (rule: Decision['rule'], outcome: Outcome, reasons: string[]): Decision => ({ rule, outcome, action: ACTIONS[outcome], reasons, ...base })

  // 1. Void
  const voidReasons: string[] = []
  if (input.srmWarning) voidReasons.push('Flagsmith SRM warning')
  if ((input.quarantineShare ?? 0) > t.quarantineMaxShare) voidReasons.push(`quarantine ${(100 * (input.quarantineShare ?? 0)).toFixed(1)}% of exposed (limit ${100 * t.quarantineMaxShare}%)`)
  if (input.codeChangedAfterStart) voidReasons.push('layout, exposure or metric code changed after start')
  if (voidReasons.length > 0) return done(1, 'void', voidReasons)

  // 2. Below minimum (Flagsmith still shows "Collecting data")
  const low: string[] = []
  for (const [name, arm] of [['control', control], ['variant', variant]] as const) {
    if (arm.n < t.identitiesPerArm) low.push(`${name} has ${arm.n} exposed (floor ${t.identitiesPerArm})`)
    if (arm.conversions < t.conversionsPerArm) low.push(`${name} has ${arm.conversions} conversions (floor ${t.conversionsPerArm})`)
  }
  if (low.length > 0) return done(2, 'below_minimum', low)

  // 3. Lose
  const loseReasons: string[] = []
  if (primary.chanceToBeat < t.chanceToBeatLose) loseReasons.push(`primary chance to beat control ${(100 * primary.chanceToBeat).toFixed(1)}% < ${100 * t.chanceToBeatLose}%`)
  if (input.flagsmithGuardrailLosing) loseReasons.push('Flagsmith marks the guardrail as losing')
  if (guardDiffPoints > t.guardrailHarmPoints) loseReasons.push(`guardrail point estimate worse by ${guardDiffPoints.toFixed(2)} points (limit ${t.guardrailHarmPoints})`)
  if (loseReasons.length > 0) return done(3, 'lose', loseReasons)

  // 4. Win
  const ciExcludesZero = primary.ci95[0] > 0
  const winOk =
    primary.chanceToBeat > t.chanceToBeatWin && ciExcludesZero && expectedLossPoints < t.expectedLossMaxPoints && guardMeasured && !guardLosing
  if (winOk) {
    return done(4, 'win', [
      `chance to beat ${(100 * primary.chanceToBeat).toFixed(1)}% > ${100 * t.chanceToBeatWin}%`,
      `95% CrI [${(100 * primary.ci95[0]).toFixed(2)}, ${(100 * primary.ci95[1]).toFixed(2)}] points excludes 0`,
      `expected loss ${expectedLossPoints.toFixed(3)} points < ${t.expectedLossMaxPoints}`,
      'guardrail measured and not losing',
    ])
  }

  // 5. Inconclusive: say which Win condition failed
  const why: string[] = []
  if (!(primary.chanceToBeat > t.chanceToBeatWin)) why.push(`chance to beat ${(100 * primary.chanceToBeat).toFixed(1)}% <= ${100 * t.chanceToBeatWin}%`)
  if (!ciExcludesZero) why.push('95% credible interval includes 0')
  if (!(expectedLossPoints < t.expectedLossMaxPoints)) why.push(`expected loss ${expectedLossPoints.toFixed(3)} points >= ${t.expectedLossMaxPoints}`)
  if (!guardMeasured) why.push(`guardrail not measured (needs >= ${t.guardrailMinEventsPerArm} events in each arm)`)
  return done(5, 'inconclusive', why)
}

function readArgs(argv: string[]): Map<string, string> {
  const m = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) m.set(argv[i].slice(2), 'true')
    else m.set(argv[i].slice(2), next)
  }
  return m
}

export function main(argv: string[]): number {
  const a = readArgs(argv)
  const num = (k: string): number => {
    const v = a.get(k)
    if (v === undefined || v.trim() === '' || !Number.isFinite(Number(v))) {
      console.error(`Missing or invalid --${k}. Needed: --control-n --control-conv --variant-n --variant-conv --guard-control --guard-variant`)
      process.exit(1)
    }
    return Number(v)
  }
  const input: DecisionInput = {
    control: { n: num('control-n'), conversions: num('control-conv') },
    variant: { n: num('variant-n'), conversions: num('variant-conv') },
    guardControl: num('guard-control'),
    guardVariant: num('guard-variant'),
    srmWarning: a.has('srm-warning'),
    quarantineShare: a.has('quarantine-pct') ? Number(a.get('quarantine-pct')) / 100 : 0,
    codeChangedAfterStart: a.has('code-changed'),
    flagsmithGuardrailLosing: a.has('flagsmith-guardrail-losing'),
  }
  const seed = a.has('seed') ? Number(a.get('seed')) : 1
  const draws = a.has('draws') ? Number(a.get('draws')) : 100_000
  const d = decide(input, mulberry32(seed), loadThresholds(), draws)
  const pct = (x: number) => `${(100 * x).toFixed(2)}%`
  console.log(`Own Beta-Binomial reading (NOT Flagsmith's number). seed=${seed} draws=${draws}, uniform Beta(1,1) prior`)
  console.log(`primary   control ${input.control.conversions}/${input.control.n} = ${pct(d.rates.control)}   variant ${input.variant.conversions}/${input.variant.n} = ${pct(d.rates.variant)}`)
  console.log(`          chance to beat control ${pct(d.primary.chanceToBeat)}   mean diff ${(100 * d.primary.meanDiff).toFixed(2)} pts   95% CrI [${(100 * d.primary.ci95[0]).toFixed(2)}, ${(100 * d.primary.ci95[1]).toFixed(2)}] pts`)
  console.log(`          expected loss of shipping ${d.expectedLossPoints.toFixed(3)} points`)
  console.log(`guardrail control ${input.guardControl}/${input.control.n} = ${pct(d.guardrail.control)}   variant ${input.guardVariant}/${input.variant.n} = ${pct(d.guardrail.variant)}   diff ${d.guardrail.diffPoints.toFixed(2)} pts   chance variant worse ${pct(d.guardrail.chanceWorse)}`)
  console.log(`          measured: ${d.guardrail.measured}   losing: ${d.guardrail.losing}`)
  // Informational only: the pre-registered rule voids on Flagsmith's SRM warning (--srm-warning), not on this number.
  const srmP = srmPValue(input.control.n, input.variant.n)
  console.log(`srm       own chi-square p = ${srmP.toPrecision(3)} (50/50 expected; informational, the rule uses --srm-warning)`)
  if (srmP < 0.01 && !input.srmWarning) console.log('          NOTE: own SRM check p < 0.01 but no --srm-warning given. Check the Flagsmith dashboard before trusting a Win.')
  console.log(`RULE ${d.rule}: ${d.outcome.toUpperCase()}`)
  for (const r of d.reasons) console.log(`  - ${r}`)
  console.log(`ACTION: ${d.action}`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2))
