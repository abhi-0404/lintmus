/** Small seeded PRNG (mulberry32). Same seed gives the same sequence. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mix a run seed and a user index into one 32-bit seed (splitmix-style), so each simulated user has its own stream. */
export function userSeed(seed: number, index: number): number {
  let z = (seed >>> 0) + Math.imul(index + 1, 0x9e3779b9)
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
  return (z ^ (z >>> 16)) >>> 0
}

/** Independent stream for one simulated user: same (seed, index) gives the same draws whatever arm the server assigns. */
export function userRng(seed: number, index: number): () => number {
  return mulberry32(userSeed(seed, index))
}
