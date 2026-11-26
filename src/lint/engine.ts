import { detectLanguage } from './detect-language.ts'
import { RULES } from './rules/index.ts'
import { stripComments } from './strip.ts'
import type { Finding, LintContext, LintOptions, LintResult } from './types.ts'

/** Parse a comma or newline separated metric-name field into a clean list. */
export function parseMetricNames(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))]
}

export function lint(source: string, options: LintOptions = {}): LintResult {
  const language = options.language ?? detectLanguage(source)
  const ctx: LintContext = {
    source,
    code: stripComments(source, language),
    language,
    metricNames: options.metricNames ?? [],
  }
  const findings: Finding[] = []
  for (const rule of RULES) {
    if (!rule.languages.includes(language)) continue
    findings.push(...rule.check(ctx))
  }
  findings.sort((a, b) => a.line - b.line || a.id.localeCompare(b.id))
  return { language, findings }
}
