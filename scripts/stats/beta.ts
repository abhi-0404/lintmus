// Beta sampling and a small Beta-Binomial toolkit, no dependencies. Used by expected-loss.ts and power.ts.
// Our own reading of the data: it is NOT Flagsmith's number (Flagsmith computes its own Bayesian results).

type Rand = () => number

/** Standard normal draw (Box-Muller). */
export function normal(rand: Rand): number {
  let u = rand()
  while (u === 0) u = rand()
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Gamma(shape, scale 1) draw, Marsaglia and Tsang (2000). Shapes below 1 use the boost Gamma(a+1) * U^(1/a). */
export function gamma(shape: number, rand: Rand): number {
  if (!(shape > 0)) throw new RangeError(`gamma shape must be positive, got ${shape}`)
  if (shape < 1) {
    let u = rand()
    while (u === 0) u = rand()
    return gamma(shape + 1, rand) * Math.pow(u, 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number
    let v: number
    do {
      x = normal(rand)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rand()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/** Beta(a, b) draw as G_a / (G_a + G_b). */
export function beta(a: number, b: number, rand: Rand): number {
  const x = gamma(a, rand)
  const y = gamma(b, rand)
  return x / (x + y)
}

/** Posterior of a conversion rate under a Beta(prior, prior) prior (default uniform) after `conversions` of `n`. */
export function posteriorParams(conversions: number, n: number, prior = 1): { a: number; b: number } {
  if (conversions < 0 || conversions > n) throw new RangeError(`need 0 <= conversions <= n, got ${conversions} of ${n}`)
  return { a: prior + conversions, b: prior + n - conversions }
}

export interface ArmCounts {
  n: number
  conversions: number
}

export interface Comparison {
  /** P(variant rate > control rate). */
  chanceToBeat: number
  /** E[max(control - variant, 0)], in rate units (0.005 = 0.5 points). Loss if we ship the variant and control was better. */
  expectedLoss: number
  /** Posterior mean of variant - control. */
  meanDiff: number
  /** 95% credible interval of variant - control. */
  ci95: [number, number]
  draws: number
}

function quantile(sorted: Float64Array, q: number): number {
  const pos = q * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Monte Carlo comparison of two Beta-Binomial posteriors. Pass a seeded rand for reproducible output. */
export function compare(control: ArmCounts, variant: ArmCounts, rand: Rand, draws = 40_000, prior = 1): Comparison {
  const pc = posteriorParams(control.conversions, control.n, prior)
  const pv = posteriorParams(variant.conversions, variant.n, prior)
  const diffs = new Float64Array(draws)
  let wins = 0
  let loss = 0
  let sum = 0
  for (let i = 0; i < draws; i++) {
    const c = beta(pc.a, pc.b, rand)
    const v = beta(pv.a, pv.b, rand)
    const d = v - c
    diffs[i] = d
    sum += d
    if (d > 0) wins++
    else loss += -d
  }
  diffs.sort()
  return {
    chanceToBeat: wins / draws,
    expectedLoss: loss / draws,
    meanDiff: sum / draws,
    ci95: [quantile(diffs, 0.025), quantile(diffs, 0.975)],
    draws,
  }
}

/** Binomial(n, p) draw by summing Bernoulli trials (n is at most a few thousand here). */
export function binomial(n: number, p: number, rand: Rand): number {
  let k = 0
  for (let i = 0; i < n; i++) if (rand() < p) k++
  return k
}

/** Normal-approximation survival function P(Z > z) via the Abramowitz-Stegun erfc approximation (error < 1.5e-7). */
export function normalSf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const erfc = poly * Math.exp(-x * x)
  return z >= 0 ? erfc / 2 : 1 - erfc / 2
}

/** Chi-square p-value for one degree of freedom (an SRM test of two arm counts against a 50/50 split). */
export function srmPValue(a: number, b: number): number {
  const total = a + b
  if (total === 0) return 1
  const expected = total / 2
  const chi2 = ((a - expected) ** 2 + (b - expected) ** 2) / expected
  return 2 * normalSf(Math.sqrt(chi2))
}
