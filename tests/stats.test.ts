import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../scripts/sim/prng.ts'
import { beta, binomial, compare, gamma, normal, normalSf, posteriorParams, srmPValue } from '../scripts/stats/beta.ts'

function moments(draw: () => number, n: number): { mean: number; variance: number } {
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < n; i++) {
    const x = draw()
    sum += x
    sumSq += x * x
  }
  const mean = sum / n
  return { mean, variance: sumSq / n - mean * mean }
}

describe('normal and gamma', () => {
  it('normal has mean 0 and variance 1', () => {
    const r = mulberry32(1)
    const m = moments(() => normal(r), 200_000)
    expect(Math.abs(m.mean)).toBeLessThan(0.01)
    expect(Math.abs(m.variance - 1)).toBeLessThan(0.02)
  })
  it.each([0.5, 1, 2.5, 10, 120])('gamma(%d) has mean = variance = shape', (shape) => {
    const r = mulberry32(shape * 1000 + 3)
    const m = moments(() => gamma(shape, r), 200_000)
    expect(Math.abs(m.mean - shape) / shape).toBeLessThan(0.02)
    expect(Math.abs(m.variance - shape) / shape).toBeLessThan(0.05)
  })
  it('rejects a non-positive shape', () => {
    expect(() => gamma(0, mulberry32(1))).toThrow(RangeError)
  })
})

describe('beta (moments check)', () => {
  it.each([
    [1, 1],
    [0.5, 0.5],
    [2, 5],
    [30, 70],
    [520, 980],
  ])('Beta(%d, %d) matches the exact mean and variance', (a, b) => {
    const r = mulberry32(a * 100 + b)
    const m = moments(() => beta(a, b, r), 200_000)
    const mean = a / (a + b)
    const variance = (a * b) / ((a + b) ** 2 * (a + b + 1))
    expect(Math.abs(m.mean - mean)).toBeLessThan(0.004)
    expect(Math.abs(m.variance - variance) / variance).toBeLessThan(0.06)
  })
  it('stays inside [0, 1] and is reproducible for a seed', () => {
    const a = mulberry32(5)
    const b = mulberry32(5)
    for (let i = 0; i < 1000; i++) {
      const x = beta(0.3, 0.3, a)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(x).toBe(beta(0.3, 0.3, b))
    }
  })
})

describe('posterior and comparison', () => {
  it('posteriorParams uses a uniform prior by default and validates input', () => {
    expect(posteriorParams(520, 1500)).toEqual({ a: 521, b: 981 })
    expect(() => posteriorParams(5, 3)).toThrow(RangeError)
  })
  it('two flat priors (no data): chance to beat 0.5, expected loss 1/6, 95% CrI about +-0.78', () => {
    const c = compare({ n: 0, conversions: 0 }, { n: 0, conversions: 0 }, mulberry32(3), 200_000)
    expect(Math.abs(c.chanceToBeat - 0.5)).toBeLessThan(0.01)
    expect(Math.abs(c.expectedLoss - 1 / 6)).toBeLessThan(0.003)
    expect(Math.abs(c.meanDiff)).toBeLessThan(0.01)
    expect(Math.abs(c.ci95[0] + 0.776)).toBeLessThan(0.02)
    expect(Math.abs(c.ci95[1] - 0.776)).toBeLessThan(0.02)
  })
  it('binomial draws have the right mean', () => {
    const r = mulberry32(9)
    const m = moments(() => binomial(200, 0.35, r), 5000)
    expect(Math.abs(m.mean - 70)).toBeLessThan(0.7)
  })
})

describe('normalSf and srmPValue', () => {
  it('normalSf matches known values', () => {
    expect(normalSf(0)).toBeCloseTo(0.5, 6)
    expect(normalSf(1.644854)).toBeCloseTo(0.05, 4)
    expect(normalSf(1.959964)).toBeCloseTo(0.025, 4)
    expect(normalSf(-1.959964)).toBeCloseTo(0.975, 4)
  })
  it('srmPValue: balanced is 1, 1500 vs 1350 is about 0.005, small gaps are not flagged', () => {
    expect(srmPValue(100, 100)).toBeCloseTo(1, 6)
    expect(srmPValue(1500, 1350)).toBeGreaterThan(0.003)
    expect(srmPValue(1500, 1350)).toBeLessThan(0.008)
    expect(srmPValue(10, 14)).toBeGreaterThan(0.4)
    expect(srmPValue(0, 0)).toBe(1)
  })
})
