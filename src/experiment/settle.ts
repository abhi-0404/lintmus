// Settled-state detector (EXPERIMENT.md section 3.5): a text counts as "settled" after 4 s with no
// keystroke, or immediately after a paste or a blur. Pure timing logic, no DOM, unit-tested.

export interface SettleOptions {
  idleMs: number
  onSettled: (text: string) => void
}

export type InputKind = 'type' | 'paste'

export interface SettleDetector {
  /** Report the new text after every edit. A paste settles at once; typing waits for idleMs of quiet. */
  input: (text: string, kind?: InputKind) => void
  /** The field lost focus: settle now if there is an unsettled edit. */
  blur: () => void
  /** Drop any pending timer (unmount). */
  dispose: () => void
}

export function createSettleDetector({ idleMs, onSettled }: SettleOptions): SettleDetector {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: string | null = null

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  const flush = () => {
    clear()
    if (pending === null) return
    const text = pending
    pending = null
    onSettled(text)
  }

  return {
    input(text, kind = 'type') {
      pending = text
      clear()
      if (kind === 'paste') flush()
      else timer = setTimeout(flush, idleMs)
    },
    blur: flush,
    dispose() {
      clear()
      pending = null
    },
  }
}
