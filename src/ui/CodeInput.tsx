import { useEffect, useRef } from 'react'
import { createSettleDetector } from '../experiment/settle.ts'
import type { SettleDetector } from '../experiment/settle.ts'

/**
 * The code textarea. Findings are linted live by the parent; this component also reports SETTLED states
 * (4 s idle, paste, blur) through onSettled, which is the only thing metrics ever see.
 */
export function CodeInput({
  value,
  onChange,
  onSettled,
  idleMs,
}: {
  value: string
  onChange: (text: string) => void
  onSettled: (text: string) => void
  idleMs: number
}) {
  const detector = useRef<SettleDetector | null>(null)
  const latest = useRef(onSettled)
  latest.current = onSettled

  useEffect(() => {
    const d = createSettleDetector({ idleMs, onSettled: (t) => latest.current(t) })
    detector.current = d
    return () => d.dispose()
  }, [idleMs])

  return (
    <div className="field">
      <label htmlFor="code">Your Flagsmith code (JavaScript, TypeScript or Python)</label>
      <textarea
        id="code"
        className="code"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={16}
        value={value}
        onChange={(e) => {
          const type = (e.nativeEvent as InputEvent).inputType ?? ''
          onChange(e.target.value)
          detector.current?.input(e.target.value, type === 'insertFromPaste' || type === 'insertFromDrop' ? 'paste' : 'type')
        }}
        onBlur={() => detector.current?.blur()}
      />
      <p className="hint">Your code never leaves this browser. It is checked on this page only.</p>
    </div>
  )
}
