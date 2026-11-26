import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lint, parseMetricNames } from '../src/lint/engine.ts'
import { PUZZLE_CODE, PUZZLE_METRIC_NAMES, PUZZLE_SOLUTION } from '../src/lint/samples.ts'
import { stripComments } from '../src/lint/strip.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const ids = (src: string, metricNames: string[] = ['checkout_completed']) =>
  lint(src, { metricNames }).findings.map((f) => f.ruleId)

describe('rule fixtures (one failing and one passing each)', () => {
  it('r01 enableEvents missing (JS)', () => {
    expect(ids(fixture('r01-fail.js'))).toContain('r01')
    expect(ids(fixture('r01-pass.js'))).not.toContain('r01')
  })
  it('r01 enable_events missing (Python)', () => {
    expect(ids(fixture('r01-fail.py'))).toContain('r01')
    expect(ids(fixture('r01-pass.py'))).not.toContain('r01')
  })
  it('r02 plain flag read, no exposure', () => {
    expect(ids(fixture('r02-fail.js'))).toContain('r02')
    expect(ids(fixture('r02-pass.js'))).not.toContain('r02')
  })
  it('r03 event name mismatch', () => {
    const f = lint(fixture('r03-fail.js'), { metricNames: ['checkout_completed'] }).findings.find((x) => x.ruleId === 'r03')
    expect(f?.severity).toBe('error')
    expect(f?.fix).toContain("trackEvent('checkout_completed')")
    expect(ids(fixture('r03-pass.js'))).not.toContain('r03')
  })
  it('r04 Python buffered events (possible issue)', () => {
    const f = lint(fixture('r04-fail.py')).findings.find((x) => x.ruleId === 'r04')
    expect(f?.severity).toBe('possible')
    expect(ids(fixture('r04-pass.py'))).not.toContain('r04')
  })
  it('r05 duplicate init', () => {
    expect(ids(fixture('r05-fail.js'))).toContain('r05')
    expect(ids(fixture('r05-pass.js'))).not.toContain('r05')
  })
})

describe('r03 details', () => {
  const src = (name: string) => `import flagsmith from '@flagsmith/flagsmith'\nflagsmith.trackEvent('${name}')\n`
  it('flags the placeholder, with or without a metric list', () => {
    expect(ids(src('YOUR_METRIC_NAME'), [])).toContain('r03')
    expect(ids(src('YOUR_METRIC_NAME'))).toContain('r03')
  })
  it('does not flag an unrelated event name when a metric list is given', () => {
    expect(ids(src('page_viewed'))).not.toContain('r03')
  })
  it('flags a near miss within edit distance 2', () => {
    expect(ids(src('checkout_complete'))).toContain('r03')
  })
  it('without a list, flags non snake_case as a possible issue only', () => {
    const f = lint(src('Checkout Completed'), { metricNames: [] }).findings.find((x) => x.ruleId === 'r03')
    expect(f?.severity).toBe('possible')
    expect(ids(src('checkout_completed'), [])).not.toContain('r03')
  })
})

describe('r05 details', () => {
  it('flags identify with two different keys', () => {
    const src = `import flagsmith from '@flagsmith/flagsmith'\nflagsmith.identify('a')\nflagsmith.identify('b')\n`
    expect(lint(src).findings.map((f) => f.id)).toContain('r05:identify')
  })
  it('does not flag identify with the same key', () => {
    const src = `import flagsmith from '@flagsmith/flagsmith'\nflagsmith.identify('a')\nflagsmith.identify('a')\n`
    expect(lint(src).findings.map((f) => f.id)).not.toContain('r05:identify')
  })
})

describe('puzzle', () => {
  it('has exactly three planted bugs: r01, r02, r03', () => {
    const { findings } = lint(PUZZLE_CODE, { metricNames: PUZZLE_METRIC_NAMES })
    expect(findings.map((f) => f.ruleId).sort()).toEqual(['r01', 'r02', 'r03'])
  })
  it('the solution has no findings', () => {
    expect(lint(PUZZLE_SOLUTION, { metricNames: PUZZLE_METRIC_NAMES }).findings).toEqual([])
  })
  it('finding ids are stable across an unrelated edit', () => {
    const a = lint(PUZZLE_CODE, { metricNames: PUZZLE_METRIC_NAMES }).findings.map((f) => f.id)
    const b = lint('// note\n' + PUZZLE_CODE, { metricNames: PUZZLE_METRIC_NAMES }).findings.map((f) => f.id)
    expect(b).toEqual(a)
  })
})

describe('strip and helpers', () => {
  it('blanks comments but keeps length, strings and line breaks', () => {
    const s = "a // c\nb('//x') /* m\nn */ c"
    const out = stripComments(s, 'js')
    expect(out.length).toBe(s.length)
    expect(out).toContain("b('//x')")
    expect(out.split('\n').length).toBe(s.split('\n').length)
    expect(out).not.toContain('// c')
  })
  it('blanks Python comments only outside strings', () => {
    const out = stripComments('x = "#not" # real\n', 'py')
    expect(out).toContain('"#not"')
    expect(out).not.toContain('real')
  })
  it('parses metric names', () => {
    expect(parseMetricNames('a, b\n c,,a')).toEqual(['a', 'b', 'c'])
  })
})
