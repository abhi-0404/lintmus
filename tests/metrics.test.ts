import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lint } from '../src/lint/engine.ts'
import { PUZZLE_CODE, PUZZLE_METRIC_NAMES, PUZZLE_SOLUTION } from '../src/lint/samples.ts'
import { changeFraction, createMetricsState, observeFixCopied, observeSettled, rebase } from '../src/experiment/metrics.ts'
import type { MetricName, MetricsState } from '../src/experiment/metrics.ts'
import { createSettleDetector } from '../src/experiment/settle.ts'

const NAMES = PUZZLE_METRIC_NAMES

/** Feed one text through lint + metrics, like App does for a settled state. */
function step(state: MetricsState, text: string, metricNames = NAMES) {
  return observeSettled(state, text, lint(text, { metricNames }), metricNames)
}

function baseline(text = PUZZLE_CODE, metricNames = NAMES): MetricsState {
  const first = step(createMetricsState(), text, metricNames)
  expect(first.fire).toEqual([]) // the first settled state never fires
  return first.state
}

const FIX_R03 = PUZZLE_CODE.replace('Checkout_Completed', 'checkout_completed')

describe('changeFraction', () => {
  it('is 0 for equal text and 1 for unrelated text', () => {
    expect(changeFraction('abc', 'abc')).toBe(0)
    expect(changeFraction('', '')).toBe(0)
    expect(changeFraction('aaaa', 'bbbb')).toBe(1)
  })
  it('measures a small edit as small', () => {
    expect(changeFraction(PUZZLE_CODE, FIX_R03)).toBeLessThan(0.1)
  })
})

describe('observeSettled', () => {
  it('fixing a bug in place fires finding_resolved and finding_fixed_clean', () => {
    const r = step(baseline(), FIX_R03)
    expect(r.fire).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('each metric fires at most once per identity', () => {
    let s = step(baseline(), FIX_R03)
    expect(s.fire).toContain('finding_fixed_clean')
    // fix a second bug: nothing fires again
    const fixR01 = FIX_R03.replace('identity: user.id,', 'identity: user.id,\n  enableEvents: true,')
    s = step(s.state, fixR01)
    expect(s.fire).toEqual([])
  })

  it('the solved puzzle fixed step by step ends with both outcome metrics sent once', () => {
    const all: MetricName[] = []
    let state = baseline()
    for (const text of [FIX_R03, PUZZLE_SOLUTION]) {
      const r = step(state, text)
      state = r.state
      all.push(...r.fire)
    }
    expect(all).toEqual(['finding_resolved', 'finding_fixed_clean'])
    expect(lint(PUZZLE_SOLUTION, { metricNames: NAMES }).findings).toHaveLength(0)
  })

  it('deleting the anchor (the trackEvent call) is not a fix', () => {
    const noCall = PUZZLE_CODE.replace("  flagsmith.trackEvent('Checkout_Completed')\n", '')
    const r = step(baseline(), noCall)
    expect(r.fire).toEqual([])
  })

  it('a fix that introduces a never-seen finding is resolved but not clean, and trips the guardrail', () => {
    // Blind paste: fix r03 but also paste a second init (r05, never seen before).
    const blind = FIX_R03.replace("const buttonStyle", "await flagsmith.init({ environmentID: 'k', identity: 'u', enableEvents: true })\n\nconst buttonStyle")
    const r = step(baseline(), blind)
    expect(r.fire).toEqual(['finding_resolved', 'new_finding_after_edit'])
  })

  it('a never-seen finding after an edit fires the guardrail', () => {
    const dupInit = PUZZLE_CODE.replace('const buttonStyle', "flagsmith.init({ environmentID: 'k' })\nconst buttonStyle")
    const r = step(baseline(), dupInit)
    expect(r.fire).toEqual(['new_finding_after_edit'])
  })

  it('a rename in progress keeps the same r03 finding (no guardrail, no resolve)', () => {
    const partial = PUZZLE_CODE.replace('Checkout_Completed', 'checkout_Completed')
    expect(step(baseline(), partial).fire).toEqual([])
    const near = PUZZLE_CODE.replace('Checkout_Completed', 'checkout_complete')
    expect(step(baseline(), near).fire).toEqual([])
  })

  it('a settled emptied or half-typed event name is not a fix; the later correct name is', () => {
    let s = baseline()
    for (const name of ['', 'check']) {
      const r = step(s, PUZZLE_CODE.replace('Checkout_Completed', name))
      expect(r.fire).toEqual([])
      s = r.state
    }
    expect(step(s, FIX_R03).fire).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('a settled half-typed method name (r02) is not a fix; completing it is', () => {
    const half = PUZZLE_CODE.replace('getValue', 'getExp')
    const r = step(baseline(), half)
    expect(r.fire).toEqual([])
    const done = PUZZLE_CODE.replace('getValue', 'getExperimentFlag')
    expect(step(r.state, done).fire).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('no guardrail on the first (baseline) state even though it has findings', () => {
    expect(step(createMetricsState(), PUZZLE_CODE).fire).toEqual([])
  })

  it('a wholesale replacement (60% or more) is a new baseline: nothing fires, nothing is credited', () => {
    const own = "import flagsmith from '@flagsmith/flagsmith'\nflagsmith.init({ environmentID: 'k' })\nflagsmith.trackEvent('Signup')\n"
    const r = step(baseline(), own)
    expect(r.fire).toEqual([])
    // and the pasted code's findings are now "seen", so fixing one of them can still count
    const fixed = own.replace("flagsmith.init({ environmentID: 'k' })", "flagsmith.init({ environmentID: 'k', enableEvents: true })")
    expect(step(r.state, fixed).fire).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('an unchanged text fires nothing', () => {
    const s = baseline()
    expect(step(s, PUZZLE_CODE).fire).toEqual([])
  })

  it('works for Python (r01 anchor is the client construction)', () => {
    const py = 'from flagsmith import Flagsmith\n\nflagsmith = Flagsmith(environment_key="k")\nflagsmith.track_event("done")\n'
    const fixed = py.replace('environment_key="k")', 'environment_key="k", enable_events=True)')
    const base = observeSettled(createMetricsState(), py, lint(py, { metricNames: ['done'] }))
    expect(lint(py).findings.some((f) => f.ruleId === 'r01')).toBe(true)
    const r = observeSettled(base.state, fixed, lint(fixed, { metricNames: ['done'] }))
    expect(r.fire).toContain('finding_resolved')
  })
})

describe('rebase and fix_copied', () => {
  it('rebase resets the comparison point without firing', () => {
    const s = baseline()
    const solved = rebase(s, PUZZLE_SOLUTION, lint(PUZZLE_SOLUTION, { metricNames: NAMES }))
    // from the solved baseline, going back to the buggy text is an edit that shows findings already seen: no guardrail
    expect(step(solved, PUZZLE_CODE).fire).toEqual([])
  })

  it('fix_copied fires on the first copy only', () => {
    const first = observeFixCopied(createMetricsState())
    expect(first.fire).toEqual(['fix_copied'])
    expect(observeFixCopied(first.state).fire).toEqual([])
  })
})

describe('keystroke script: half-typed states fire nothing', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** Type a new event name over 'Checkout_Completed', one key every 150 ms, then wait. */
  function typingStates(): string[] {
    const target = 'checkout_completed'
    const states: string[] = []
    for (let n = 0; n <= target.length; n++) {
      states.push(PUZZLE_CODE.replace('Checkout_Completed', target.slice(0, n)))
    }
    return states
  }

  it('even evaluating every keystroke, only the final correct name counts as a fix', () => {
    let s = baseline()
    const fired: MetricName[] = []
    for (const text of typingStates()) {
      const r = step(s, text)
      s = r.state
      fired.push(...r.fire)
    }
    // the empty and half-typed names are not fixes (r03 anchor needs an accepted name), and no new id appears
    expect(fired).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('through the settle detector, only the final text is evaluated, after 4 s idle', () => {
    let s = baseline()
    const fired: MetricName[] = []
    const evaluated: string[] = []
    const d = createSettleDetector({
      idleMs: 4000,
      onSettled: (text) => {
        evaluated.push(text)
        const r = step(s, text)
        s = r.state
        fired.push(...r.fire)
      },
    })
    const states = typingStates()
    for (const text of states) {
      d.input(text)
      vi.advanceTimersByTime(150)
    }
    expect(evaluated).toEqual([]) // nothing evaluated while typing
    expect(fired).toEqual([])
    vi.advanceTimersByTime(4000)
    expect(evaluated).toEqual([states.at(-1)])
    expect(fired).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })

  it('a half-typed wrong name that never settles never trips the guardrail', () => {
    let s = baseline()
    const fired: MetricName[] = []
    const d = createSettleDetector({
      idleMs: 4000,
      onSettled: (text) => {
        const r = step(s, text)
        s = r.state
        fired.push(...r.fire)
      },
    })
    // type 'Checkout_Complete' (a new finding id) then keep typing within 4 s to reach the right name
    d.input(PUZZLE_CODE.replace('Checkout_Completed', 'checkout_complete'))
    vi.advanceTimersByTime(2000)
    d.input(FIX_R03)
    vi.advanceTimersByTime(4000)
    expect(fired).toEqual(['finding_resolved', 'finding_fixed_clean'])
  })
})
