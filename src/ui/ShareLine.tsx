import { useState } from 'react'

/** Shown after the outcome (all findings fixed), never before, so it cannot bias the experiment. */
export function ShareLine({ fixed }: { fixed: number }) {
  const [state, setState] = useState<'idle' | 'ok' | 'failed'>('idle')
  const url = `${location.origin}${location.pathname}`
  const line = `I fixed ${fixed} silent bug${fixed === 1 ? '' : 's'} that make a Flagsmith experiment record nothing. Try the Lintmus puzzle: ${url}`
  return (
    <div className="share" role="status">
      <p>{line}</p>
      <button
        type="button"
        className="button secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(line)
            setState('ok')
          } catch {
            setState('failed')
          }
        }}
      >
        {state === 'ok' ? 'Copied' : state === 'failed' ? 'Copy failed, select the text' : 'Copy this line'}
      </button>
    </div>
  )
}
