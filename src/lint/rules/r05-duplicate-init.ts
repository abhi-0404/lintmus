import { findCalls, isFlagsmithReceiver, makeFinding, mentionsFlagsmith, pythonConstructors } from './shared.ts'
import type { Finding, Rule } from '../types.ts'

const WHY_INIT =
  'Starting the SDK twice resets its state and can reassign the identity, so exposures and conversions may be recorded for different identities. Pasting a snippet next to the old code instead of over it usually causes this.'
const WHY_IDENTIFY =
  'Calling identify twice with different keys in one file means the same visitor is counted as two identities (identity churn), which splits exposures from conversions.'

export const r05: Rule = {
  id: 'r05',
  title: 'Duplicate SDK init or identify',
  languages: ['js', 'py'],
  check(ctx) {
    if (!mentionsFlagsmith(ctx)) return []
    const out: Finding[] = []
    if (ctx.language === 'js') {
      const inits = findCalls(ctx, 'init', true).filter((c) => isFlagsmithReceiver(ctx, c.receiver))
      const byReceiver = new Map<string, number[]>()
      for (const c of inits) byReceiver.set(c.receiver!, [...(byReceiver.get(c.receiver!) ?? []), c.line])
      const dup = [...byReceiver.values()].find((lines) => lines.length > 1)
      if (dup) {
        out.push(
          makeFinding({
            id: 'r05:init',
            ruleId: 'r05',
            title: 'SDK is initialised more than once',
            line: dup[1]!,
            why: WHY_INIT,
            fix: '// Keep exactly one flagsmith.init({ ... }) call, run once at app start.',
          }),
        )
      }
      const keys = new Map<string, number>()
      for (const c of findCalls(ctx, 'identify', true).filter((c) => isFlagsmithReceiver(ctx, c.receiver))) {
        const key = c.args.split(',')[0]!.trim()
        if (key && !keys.has(key)) keys.set(key, c.line)
      }
      if (keys.size > 1) {
        out.push(
          makeFinding({
            id: 'r05:identify',
            ruleId: 'r05',
            title: 'identify is called with different keys',
            line: [...keys.values()][1]!,
            why: WHY_IDENTIFY,
            fix: '// Pass the identity once, in init: flagsmith.init({ ..., identity: userId })',
          }),
        )
      }
      return out
    }
    const ctors = pythonConstructors(ctx)
    if (ctors.length > 1) {
      out.push(
        makeFinding({
          id: 'r05:init',
          ruleId: 'r05',
          title: 'SDK client is constructed more than once',
          line: ctors[1]!.line,
          why: WHY_INIT,
          fix: '# Construct one Flagsmith(...) client and reuse it everywhere.',
        }),
      )
    }
    return out
  },
}
