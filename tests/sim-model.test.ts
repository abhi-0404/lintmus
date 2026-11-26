import { describe, expect, it } from 'vitest'
import {
  ARMS, drawUser, dryRunArm, expectedRates, outcomeFor, simulateUser, simulateWorld, WORLDS, worldParams,
} from '../scripts/sim/model.ts'
import { userRng } from '../scripts/sim/prng.ts'

describe('sim model: determinism and structure', () => {
  it('the same (world, seed, index, arm) gives the same outcome', () => {
    for (const w of WORLDS) {
      expect(simulateUser(w, 42, 5, 'fix_first')).toEqual(simulateUser(w, 42, 5, 'fix_first'))
    }
  })
  it('simulateWorld is reproducible and differs across seeds', () => {
    expect(simulateWorld('mde', 42, 500)).toEqual(simulateWorld('mde', 42, 500))
    expect(simulateWorld('mde', 42, 500)).not.toEqual(simulateWorld('mde', 43, 500))
  })
  it('the draw does not depend on the arm (common random numbers)', () => {
    expect(drawUser(userRng(9, 3))).toEqual(drawUser(userRng(9, 3)))
  })
  it('clean implies resolved, and a user with a new finding was a resolver too', () => {
    for (const w of WORLDS) {
      for (let i = 0; i < 2000; i++) {
        for (const arm of ARMS) {
          const o = simulateUser(w, 1, i, arm).outcome
          if (o.finding_fixed_clean) expect(o.finding_resolved).toBe(true)
          if (o.new_finding_after_edit) expect(o.finding_resolved).toBe(true)
        }
      }
    }
  })
  it('dry-run assignment is about 50/50', () => {
    let fix = 0
    const n = 10000
    for (let i = 0; i < n; i++) if (dryRunArm(42, i) === 'fix_first') fix++
    expect(Math.abs(fix / n - 0.5)).toBeLessThan(0.02)
  })
})

describe('sim model: the variant changes mechanisms only', () => {
  it('A/A world: every user gets the same outcome in both arms', () => {
    const p = worldParams('aa')
    expect(p.arms.explain_first).toEqual(p.arms.fix_first)
    for (let i = 0; i < 3000; i++) {
      const d = drawUser(userRng(5, i))
      expect(outcomeFor(d, 'explain_first', p)).toEqual(outcomeFor(d, 'fix_first', p))
    }
  })
  it('only fix_first exposures are ever dropped, and only in the SRM world', () => {
    for (const w of WORLDS) {
      const p = worldParams(w)
      for (let i = 0; i < 2000; i++) {
        const d = drawUser(userRng(5, i))
        expect(outcomeFor(d, 'explain_first', p).exposureSent).toBe(true)
        if (w !== 'srm') expect(outcomeFor(d, 'fix_first', p).exposureSent).toBe(true)
      }
    }
  })
  it('SRM world drops exposures, not outcomes: same metrics as the MDE world for every user', () => {
    const srm = worldParams('srm')
    const mde = worldParams('mde')
    let dropped = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      const d = drawUser(userRng(8, i))
      const a = outcomeFor(d, 'fix_first', srm)
      const b = outcomeFor(d, 'fix_first', mde)
      expect({ ...a, exposureSent: true }).toEqual(b)
      if (!a.exposureSent) dropped++
    }
    expect(Math.abs(dropped / n - 0.1)).toBeLessThan(0.01)
  })
  it('the SRM world uses the MDE mechanisms (only the drop share differs)', () => {
    expect(worldParams('srm').arms).toEqual(worldParams('mde').arms)
    expect(worldParams('mde').dropFixFirstExposure).toBe(0)
  })
  it('a dropped exposure removes the identity from the counts (Flagsmith attributes events to exposed identities)', () => {
    const s = simulateWorld('srm', 42, 3000)
    expect(s.fix_first.exposures).toBeLessThan(s.fix_first.assigned)
    expect(s.explain_first.exposures).toBe(s.explain_first.assigned)
    expect(s.fix_first.finding_fixed_clean).toBeLessThanOrEqual(s.fix_first.exposures)
  })
})

describe('sim model: calibration to the plan (ASSUMPTIONS.md)', () => {
  const aa = expectedRates('aa', 60_000)
  const mde = expectedRates('mde', 60_000)
  const harm = expectedRates('harm', 60_000)
  it('baseline clean-fix rate is about 35%', () => {
    expect(mde.explain_first.finding_fixed_clean).toBeGreaterThan(0.34)
    expect(mde.explain_first.finding_fixed_clean).toBeLessThan(0.36)
  })
  it('A/A: no difference between arms on any metric', () => {
    for (const m of ['finding_fixed_clean', 'new_finding_after_edit', 'finding_resolved', 'fix_copied'] as const) {
      expect(aa.fix_first[m]).toBe(aa.explain_first[m])
    }
  })
  it('MDE world: expected clean-fix lift is +18% relative (17-19%) and the guardrail is not worse by 3 points', () => {
    const lift = mde.fix_first.finding_fixed_clean / mde.explain_first.finding_fixed_clean - 1
    expect(lift).toBeGreaterThan(0.17)
    expect(lift).toBeLessThan(0.19)
    expect(100 * (mde.fix_first.new_finding_after_edit - mde.explain_first.new_finding_after_edit)).toBeLessThan(3)
  })
  it('harm world: raw resolves rise more than in the MDE world and the guardrail is worse by more than 3 points', () => {
    expect(harm.fix_first.finding_resolved).toBeGreaterThan(mde.fix_first.finding_resolved)
    expect(100 * (harm.fix_first.new_finding_after_edit - harm.explain_first.new_finding_after_edit)).toBeGreaterThan(3)
  })
  it('fix_copied is a manipulation check: far higher in fix_first', () => {
    expect(mde.fix_first.fix_copied).toBeGreaterThan(2 * mde.explain_first.fix_copied)
  })
})
