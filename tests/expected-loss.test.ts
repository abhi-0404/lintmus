import { describe, expect, it } from 'vitest'
import { decide, loadThresholds, type DecisionInput } from '../scripts/expected-loss.ts'
import { mulberry32 } from '../scripts/sim/prng.ts'

const t = loadThresholds()
const run = (input: DecisionInput) => decide(input, mulberry32(1), t, 40_000)

/** A clear win: 35% vs 41.3% at 1,500 per arm, guardrail 13 vs 25 events. */
const WIN: DecisionInput = { control: { n: 1500, conversions: 525 }, variant: { n: 1500, conversions: 620 }, guardControl: 13, guardVariant: 25 }

describe('thresholds come from experiment.config.json', () => {
  it('has the pre-registered numbers', () => {
    expect(t.expectedLossMaxPoints).toBe(0.5)
    expect(t.chanceToBeatWin).toBe(0.95)
    expect(t.chanceToBeatLose).toBe(0.05)
    expect(t.guardrailHarmPoints).toBe(3)
    expect(t.guardrailMinEventsPerArm).toBe(5)
    expect(t.identitiesPerArm).toBe(50)
    expect(t.conversionsPerArm).toBe(5)
    expect(t.quarantineMaxShare).toBe(0.05)
  })
})

describe('decision rule 3.8, first match wins', () => {
  it('rule 4 Win: decisive primary, small expected loss, guardrail measured and fine', () => {
    const d = run(WIN)
    expect(d.rule).toBe(4)
    expect(d.outcome).toBe('win')
    expect(d.primary.chanceToBeat).toBeGreaterThan(0.95)
    expect(d.primary.ci95[0]).toBeGreaterThan(0)
    expect(d.expectedLossPoints).toBeLessThan(0.5)
    expect(d.action).toContain('rollout_decision = variant')
  })
  it('rates and posterior mean are consistent with the counts', () => {
    const d = run(WIN)
    expect(d.rates.control).toBeCloseTo(0.35, 6)
    expect(d.rates.variant).toBeCloseTo(620 / 1500, 6)
    expect(d.primary.meanDiff).toBeGreaterThan(0.055)
    expect(d.primary.meanDiff).toBeLessThan(0.07)
  })
  it('rule 1 Void beats everything else: SRM warning, quarantine over 5%, code change after start', () => {
    expect(run({ ...WIN, srmWarning: true }).rule).toBe(1)
    expect(run({ ...WIN, quarantineShare: 0.06 }).rule).toBe(1)
    expect(run({ ...WIN, quarantineShare: 0.05 }).rule).toBe(4)
    const d = run({ ...WIN, codeChangedAfterStart: true })
    expect(d.rule).toBe(1)
    expect(d.action).toContain('Keep explain_first')
    expect(run({ control: { n: 10, conversions: 1 }, variant: { n: 10, conversions: 0 }, guardControl: 0, guardVariant: 9, srmWarning: true }).rule).toBe(1)
  })
  it('rule 2 Below minimum: under 50 exposed or 5 conversions in either arm', () => {
    expect(run({ ...WIN, control: { n: 49, conversions: 20 }, variant: { n: 400, conversions: 200 } }).rule).toBe(2)
    expect(run({ ...WIN, control: { n: 400, conversions: 4 }, variant: { n: 400, conversions: 100 } }).rule).toBe(2)
    expect(run({ ...WIN, control: { n: 400, conversions: 100 }, variant: { n: 400, conversions: 4 } }).rule).toBe(2)
    const d = run({ control: { n: 30, conversions: 8 }, variant: { n: 32, conversions: 12 }, guardControl: 1, guardVariant: 2 })
    expect(d.rule).toBe(2)
    expect(d.reasons.length).toBeGreaterThan(0)
    expect(run({ control: { n: 50, conversions: 5 }, variant: { n: 50, conversions: 5 }, guardControl: 5, guardVariant: 5 }).rule).not.toBe(2)
  })
  it('rule 3 Lose: primary chance to beat under 5%', () => {
    const d = run({ control: { n: 1500, conversions: 620 }, variant: { n: 1500, conversions: 525 }, guardControl: 13, guardVariant: 13 })
    expect(d.rule).toBe(3)
    expect(d.primary.chanceToBeat).toBeLessThan(0.05)
    expect(d.action).toContain('rollout_decision = control')
  })
  it('rule 3 Lose: guardrail point estimate worse by more than 3 points even when the primary wins', () => {
    // control 13/1500 = 0.87%, variant 100/1500 = 6.67%: +5.8 points
    const d = run({ ...WIN, guardVariant: 100 })
    expect(d.rule).toBe(3)
    expect(d.guardrail.diffPoints).toBeGreaterThan(3)
    expect(d.guardrail.losing).toBe(true)
  })
  it('rule 3 Lose: Flagsmith marks the guardrail losing', () => {
    expect(run({ ...WIN, flagsmithGuardrailLosing: true }).rule).toBe(3)
  })
  it('a guardrail worse by under 3 points does not block a win', () => {
    // 13/1500 vs 55/1500 = +2.8 points
    const d = run({ ...WIN, guardVariant: 55 })
    expect(d.guardrail.diffPoints).toBeLessThan(3)
    expect(d.rule).toBe(4)
  })
  it('rule 5 Inconclusive: a win-like primary with an unmeasured guardrail', () => {
    const d = run({ ...WIN, guardControl: 4, guardVariant: 2 })
    expect(d.rule).toBe(5)
    expect(d.guardrail.measured).toBe(false)
    expect(d.reasons.join(' ')).toContain('guardrail not measured')
  })
  it('rule 5 Inconclusive: no clear difference', () => {
    const d = run({ control: { n: 150, conversions: 50 }, variant: { n: 150, conversions: 56 }, guardControl: 6, guardVariant: 7 })
    expect(d.rule).toBe(5)
    expect(d.outcome).toBe('inconclusive')
    expect(d.action).toContain('Do not ship')
  })
  it('never wins unless every clause holds: chance to beat, CrI, expected loss', () => {
    const d = run({ control: { n: 300, conversions: 105 }, variant: { n: 300, conversions: 135 }, guardControl: 6, guardVariant: 7 })
    if (d.outcome === 'win') {
      expect(d.primary.chanceToBeat).toBeGreaterThan(0.95)
      expect(d.primary.ci95[0]).toBeGreaterThan(0)
      expect(d.expectedLossPoints).toBeLessThan(0.5)
    } else {
      expect(d.rule).toBe(5)
    }
  })
  it('is reproducible for a seed', () => {
    expect(run(WIN)).toEqual(run(WIN))
  })
})
