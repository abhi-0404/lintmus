import { makeFinding, mentionsFlagsmith, pythonConstructors, usesEvents } from './shared.ts'
import type { Rule } from '../types.ts'

const WHY =
  'The Python SDK buffers events and sends them in the background. A short script that exits first drops the buffer, so recent events never arrive. This applies to short scripts; a long-running server does not need it.'

export const r04: Rule = {
  id: 'r04',
  title: 'Buffered events may be dropped when the script exits',
  languages: ['py'],
  check(ctx) {
    if (!mentionsFlagsmith(ctx) || !usesEvents(ctx)) return []
    if (/\b(flask|fastapi|django|uvicorn|gunicorn|starlette|aiohttp)\b/i.test(ctx.code)) return [] // long-running server
    if (/\bmax_buffer_items\s*=\s*1\b/.test(ctx.code)) return []
    if (/\.\s*(flush|flush_events|close)\s*\(/.test(ctx.code)) return []
    const ctor = pythonConstructors(ctx)[0]
    if (!ctor) return []
    // Python option and method names are not confirmed (see docs/sdk-facts.md).
    const fix = `flagsmith = Flagsmith(
    environment_key="<server-side environment key>",
    enable_events=True,
    max_buffer_items=1,  # send each event straight away (short scripts)
)
# or flush and close the client at the end of the script, before it exits`
    return [
      makeFinding({
        id: 'r04',
        ruleId: 'r04',
        severity: 'possible',
        title: 'Possible issue: events may be dropped when a short script exits',
        line: ctor.line,
        why: WHY,
        fix,
      }),
    ]
  },
}
