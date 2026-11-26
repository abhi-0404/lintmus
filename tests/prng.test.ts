import { describe, expect, it } from 'vitest'
import { mulberry32, userRng, userSeed } from '../scripts/sim/prng.ts'

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('stays in [0, 1) and differs across seeds', () => {
    const r = mulberry32(1)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('userRng', () => {
  it('gives the same stream for the same (seed, index) and different streams otherwise', () => {
    const a = userRng(42, 7)
    const b = userRng(42, 7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(userRng(42, 7)()).not.toBe(userRng(42, 8)())
    expect(userRng(42, 7)()).not.toBe(userRng(43, 7)())
  })
  it('userSeed is a stable 32-bit unsigned integer', () => {
    const s = userSeed(42, 0)
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThan(2 ** 32)
    expect(userSeed(42, 0)).toBe(s)
  })
  it('first draws of neighbouring users average about 0.5', () => {
    let sum = 0
    const n = 20000
    for (let i = 0; i < n; i++) sum += userRng(1, i)()
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.01)
  })
})
