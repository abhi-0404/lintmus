// Behavioural model for the simulated worlds (EXPERIMENT.md section 7, ASSUMPTIONS.md lists every number).
// The simulation validates the design and the decision rule; it says nothing about developers.
//
// A simulated user has three latent traits (experience, patience, bug count). The variant changes
// MECHANISMS only: how likely the user reads the explanation, how likely they see the fix, and how
// likely a blind paste of the fix introduces a new finding. Outcomes are never set directly.
//
// Common random numbers: every user draws the same fixed list of uniforms whatever arm they get, so the
// same person would behave the same in both arms except where a mechanism differs. Pure and deterministic.
import { userRng } from './prng.ts'

export type World = 'aa' | 'mde' | 'harm' | 'srm'
export const WORLDS: readonly World[] = ['aa', 'mde', 'harm', 'srm']

export type Arm = 'explain_first' | 'fix_first'
export const ARMS: readonly Arm[] = ['explain_first', 'fix_first']

/** Per-arm mechanisms (the only thing a variant may change). */
export interface Mechanisms {
  /** P(the user reads the explanation of a finding they are working on). */
  pReadExplanation: number
  /** P(the user sees the corrected snippet while working on a finding). */
  pSeesFix: number
  /** Base P(a blind paste of the fix, without understanding it, leaves a new finding). Scaled down by experience. */
  pBlindPaste: number
  /** P(the user clicks Copy, given they saw the fix). */
  pCopyGivenSeesFix: number
}

/** Model constants shared by both arms in every world. */
export const SHARED = {
  /** P(engage at all) = engageBase + engagePatienceSlope * (patience - 0.5). */
  engageBase: 0.55,
  engagePatienceSlope: 0.4,
  /** P(a user who read the explanation understands it) = understandBase + understandSlope * experience. */
  understandBase: 0.2,
  understandSlope: 0.5,
  /** P(a user who sees the fix applies it correctly enough to fix the finding). */
  pApplyFix: 0.8,
  /** Blind-paste risk is multiplied by (1 - experienceShield * experience). */
  experienceShield: 0.6,
  /** Bug count distribution: P(1), P(2), the rest is 3 (the puzzle plants 3). */
  pOneBug: 0.4,
  pTwoBugs: 0.35,
  /** Tries per engaged user: 1, plus one if patience > patienceTry2, plus one if patience > patienceTry3. */
  patienceTry2: 0.4,
  patienceTry3: 0.8,
} as const

export interface WorldParams {
  arms: Record<Arm, Mechanisms>
  /** Share of fix_first exposures that never reach Flagsmith (the crashing-card bug). Outcomes are untouched. */
  dropFixFirstExposure: number
}

/** Mechanisms of the control layout (explain first, fix hidden behind "Show fix"). Assumed, see ASSUMPTIONS.md. */
const CONTROL: Mechanisms = { pReadExplanation: 0.87, pSeesFix: 0.3, pBlindPaste: 0.1, pCopyGivenSeesFix: 0.3 }
/** Fix-first layout in the MDE world: tuned so the expected clean-fix lift is +18% relative. */
const FIX_FIRST_MDE: Mechanisms = { pReadExplanation: 0.4, pSeesFix: 0.75, pBlindPaste: 0.06, pCopyGivenSeesFix: 0.55 }
/** Fix-first layout in the harm world: the fix is seen even more, raw resolves rise, blind-paste risk is double the control's. */
const FIX_FIRST_HARM: Mechanisms = { ...FIX_FIRST_MDE, pSeesFix: 0.9, pBlindPaste: 0.2 }

export function worldParams(world: World): WorldParams {
  switch (world) {
    case 'aa':
      // The variant is ignored by the model: both arms use the control mechanisms.
      return { arms: { explain_first: CONTROL, fix_first: CONTROL }, dropFixFirstExposure: 0 }
    case 'mde':
      return { arms: { explain_first: CONTROL, fix_first: FIX_FIRST_MDE }, dropFixFirstExposure: 0 }
    case 'harm':
      return { arms: { explain_first: CONTROL, fix_first: FIX_FIRST_HARM }, dropFixFirstExposure: 0 }
    case 'srm':
      return { arms: { explain_first: CONTROL, fix_first: FIX_FIRST_MDE }, dropFixFirstExposure: 0.1 }
  }
}

export const MAX_ATTEMPTS = 3

interface AttemptDraw {
  read: number
  understand: number
  sees: number
  apply: number
  blind: number
}

/** All the randomness of one user, drawn in a fixed order so it does not depend on the arm. */
export interface UserDraw {
  experience: number
  patience: number
  bugs: 1 | 2 | 3
  engage: number
  attempts: AttemptDraw[]
  copy: number
  drop: number
}

export function drawUser(rand: () => number): UserDraw {
  const experience = (rand() + rand()) / 2
  const patience = (rand() + rand()) / 2
  const bugU = rand()
  const bugs = bugU < SHARED.pOneBug ? 1 : bugU < SHARED.pOneBug + SHARED.pTwoBugs ? 2 : 3
  const engage = rand()
  const attempts: AttemptDraw[] = []
  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    attempts.push({ read: rand(), understand: rand(), sees: rand(), apply: rand(), blind: rand() })
  }
  return { experience, patience, bugs, engage, attempts, copy: rand(), drop: rand() }
}

/** The four Flagsmith metrics for one user plus whether the exposure reaches Flagsmith. */
export interface Outcome {
  finding_fixed_clean: boolean
  new_finding_after_edit: boolean
  finding_resolved: boolean
  fix_copied: boolean
  /** False when the exposure event is dropped (SRM world). */
  exposureSent: boolean
}

export function pEngage(patience: number): number {
  const p = SHARED.engageBase + SHARED.engagePatienceSlope * (patience - 0.5)
  return Math.min(1, Math.max(0, p))
}

export function triesFor(patience: number): number {
  return 1 + (patience > SHARED.patienceTry2 ? 1 : 0) + (patience > SHARED.patienceTry3 ? 1 : 0)
}

export function outcomeFor(draw: UserDraw, arm: Arm, params: WorldParams): Outcome {
  const m = params.arms[arm]
  const engaged = draw.engage < pEngage(draw.patience)
  const nAttempts = engaged ? Math.min(draw.bugs, triesFor(draw.patience)) : 0
  const pUnderstand = SHARED.understandBase + SHARED.understandSlope * draw.experience
  const blindRisk = m.pBlindPaste * (1 - SHARED.experienceShield * draw.experience)

  let resolved = false
  let clean = false
  let newFinding = false
  let sawFix = false
  for (let k = 0; k < nAttempts; k++) {
    const a = draw.attempts[k]
    const understood = a.read < m.pReadExplanation && a.understand < pUnderstand
    const sees = a.sees < m.pSeesFix
    if (sees) sawFix = true
    const appliedFix = sees && a.apply < SHARED.pApplyFix
    if (understood) {
      // Understanding the explanation gives a correct hand fix: no blind-paste risk.
      resolved = true
      clean = true
    } else if (appliedFix) {
      resolved = true
      if (a.blind < blindRisk) newFinding = true
      else clean = true
    }
  }
  return {
    finding_fixed_clean: clean,
    new_finding_after_edit: newFinding,
    finding_resolved: resolved,
    fix_copied: sawFix && draw.copy < m.pCopyGivenSeesFix,
    exposureSent: !(arm === 'fix_first' && draw.drop < params.dropFixFirstExposure),
  }
}

export interface SimUser {
  index: number
  arm: Arm
  outcome: Outcome
}

/** Dry-run assignment: a seeded 50/50 coin per user (live runs take the arm from Flagsmith instead). */
export function dryRunArm(seed: number, index: number): Arm {
  return userRng(seed ^ 0x5eed5eed, index)() < 0.5 ? 'explain_first' : 'fix_first'
}

export function simulateUser(world: World, seed: number, index: number, arm: Arm, params: WorldParams = worldParams(world)): SimUser {
  const draw = drawUser(userRng(seed, index))
  return { index, arm, outcome: outcomeFor(draw, arm, params) }
}

export interface ArmSummary {
  /** Identities the server put in this arm. */
  assigned: number
  /** Identities with an exposure event in Flagsmith. Metric counts below are over these identities only. */
  exposures: number
  finding_fixed_clean: number
  new_finding_after_edit: number
  finding_resolved: number
  fix_copied: number
}

export type Summary = Record<Arm, ArmSummary>

export function emptySummary(): Summary {
  const blank = (): ArmSummary => ({
    assigned: 0, exposures: 0, finding_fixed_clean: 0, new_finding_after_edit: 0, finding_resolved: 0, fix_copied: 0,
  })
  return { explain_first: blank(), fix_first: blank() }
}

export function addToSummary(s: Summary, u: SimUser): void {
  const a = s[u.arm]
  a.assigned++
  // Flagsmith attributes conversions only to identities with an exposure, so a dropped exposure hides the outcome
  // from the results (the events themselves are still sent live).
  if (!u.outcome.exposureSent) return
  a.exposures++
  if (u.outcome.finding_fixed_clean) a.finding_fixed_clean++
  if (u.outcome.new_finding_after_edit) a.new_finding_after_edit++
  if (u.outcome.finding_resolved) a.finding_resolved++
  if (u.outcome.fix_copied) a.fix_copied++
}

/** Whole world offline with the dry-run assignment. Identities are 0 .. n-1. */
export function simulateWorld(world: World, seed: number, n: number, params: WorldParams = worldParams(world)): Summary {
  const s = emptySummary()
  for (let i = 0; i < n; i++) addToSummary(s, simulateUser(world, seed, i, dryRunArm(seed, i), params))
  return s
}

/** Model expectation per arm by Monte Carlo over `users` simulated users (same draws in both arms). Rates are 0-1. */
export function expectedRates(world: World, users = 100_000, params: WorldParams = worldParams(world)): Record<Arm, Record<'finding_fixed_clean' | 'new_finding_after_edit' | 'finding_resolved' | 'fix_copied', number>> {
  const sums = { explain_first: [0, 0, 0, 0], fix_first: [0, 0, 0, 0] }
  for (let i = 0; i < users; i++) {
    const draw = drawUser(userRng(0x0e7a11, i))
    for (const arm of ARMS) {
      const o = outcomeFor(draw, arm, params)
      sums[arm][0] += +o.finding_fixed_clean
      sums[arm][1] += +o.new_finding_after_edit
      sums[arm][2] += +o.finding_resolved
      sums[arm][3] += +o.fix_copied
    }
  }
  const out = (a: number[]) => ({ finding_fixed_clean: a[0] / users, new_finding_after_edit: a[1] / users, finding_resolved: a[2] / users, fix_copied: a[3] / users })
  return { explain_first: out(sums.explain_first), fix_first: out(sums.fix_first) }
}
