import type { Language } from './types.ts'

/** Cheap heuristic: Python markers vs JS/TS markers. Defaults to JS. */
export function detectLanguage(source: string): Language {
  let py = 0
  let js = 0
  if (/^\s*(from\s+[\w.]+\s+import|import\s+[\w.]+\s*$)/m.test(source)) py += 2
  if (/^\s*def\s+\w+\s*\(/m.test(source)) py += 2
  if (/\b(True|False|None)\b/.test(source)) py += 1
  if (/^\s*#(?!!)/m.test(source)) py += 1
  if (/\benable_events\b|\bfrom\s+flagsmith\b/.test(source)) py += 2
  if (/\b(const|let|var)\s+\w+/.test(source)) js += 2
  if (/\bimport\s+[\s\S]*?\bfrom\s+['"]/.test(source)) js += 2
  if (/=>|;\s*$/m.test(source)) js += 1
  if (/\bawait\b|\brequire\(/.test(source)) js += 1
  if (/@flagsmith\//.test(source)) js += 2
  return py > js ? 'py' : 'js'
}
