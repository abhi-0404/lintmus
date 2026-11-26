export type Language = 'js' | 'py'

export type Severity = 'error' | 'possible'

export interface Finding {
  /** Stable across edits: rule id plus a discriminator, so "never seen before" can be tracked. */
  id: string
  ruleId: string
  title: string
  severity: Severity
  /** 1-based line of the per-rule anchor (the call the finding is about). */
  line: number
  /** Why this breaks an experiment (plain text). */
  why: string
  /** Corrected snippet. Uses the user's metric names, else the literal YOUR_METRIC_NAME. */
  fix: string
  docsUrl: string
}

export interface LintOptions {
  /** Metric names the user typed in the metric-names field. */
  metricNames?: string[]
  /** Force a language instead of detecting it. */
  language?: Language
}

export interface LintContext {
  /** Original source text. */
  source: string
  /** Source with comments blanked out (same length, same line breaks); strings are kept. */
  code: string
  language: Language
  metricNames: string[]
}

export interface Rule {
  id: string
  title: string
  languages: Language[]
  check: (ctx: LintContext) => Finding[]
}

export interface LintResult {
  language: Language
  findings: Finding[]
}
