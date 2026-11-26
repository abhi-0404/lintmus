import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettleDetector } from '../src/experiment/settle.ts'

describe('settled-state detector', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => {
    const settled: string[] = []
    const d = createSettleDetector({ idleMs: 4000, onSettled: (t) => settled.push(t) })
    return { d, settled }
  }

  it('settles only after 4 s without a keystroke', () => {
    const { d, settled } = make()
    d.input('a')
    vi.advanceTimersByTime(3999)
    expect(settled).toEqual([])
    vi.advanceTimersByTime(1)
    expect(settled).toEqual(['a'])
  })

  it('every keystroke restarts the clock and only the last text settles', () => {
    const { d, settled } = make()
    for (const t of ['f', 'fl', 'fla', 'flag']) {
      d.input(t)
      vi.advanceTimersByTime(3000)
    }
    expect(settled).toEqual([])
    vi.advanceTimersByTime(1000)
    expect(settled).toEqual(['flag'])
  })

  it('a paste settles immediately and cancels the idle timer', () => {
    const { d, settled } = make()
    d.input('typed')
    d.input('pasted text', 'paste')
    expect(settled).toEqual(['pasted text'])
    vi.advanceTimersByTime(10_000)
    expect(settled).toEqual(['pasted text'])
  })

  it('blur settles an unsettled edit at once, and only once', () => {
    const { d, settled } = make()
    d.input('abc')
    d.blur()
    expect(settled).toEqual(['abc'])
    d.blur()
    vi.advanceTimersByTime(10_000)
    expect(settled).toEqual(['abc'])
  })

  it('blur with nothing pending does nothing', () => {
    const { d, settled } = make()
    d.blur()
    expect(settled).toEqual([])
  })

  it('dispose drops the pending settle', () => {
    const { d, settled } = make()
    d.input('abc')
    d.dispose()
    vi.advanceTimersByTime(10_000)
    expect(settled).toEqual([])
  })
})
