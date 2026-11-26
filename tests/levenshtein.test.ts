import { describe, expect, it } from 'vitest'
import { levenshtein } from '../src/lint/levenshtein.ts'

describe('levenshtein', () => {
  it('is 0 for equal strings', () => expect(levenshtein('abc', 'abc')).toBe(0))
  it('counts insert, delete and substitute', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })
  it('sees a capital letter as a distance of 1', () => {
    expect(levenshtein('Checkout_completed', 'checkout_completed')).toBe(1)
  })
})
