import { describe, expect, it, vi } from 'vitest'
import { createExposureTracker, shouldTrackExposure } from '../src/experiment/exposure.ts'
import type { ExperimentState } from '../src/experiment/exposure.ts'

const server: ExperimentState = {
  identity: 'a-guid',
  style: 'fix_first',
  fromServer: true,
  inExperiment: true,
  variant: 'fix-first',
  experimentId: 7,
  excluded: false,
  optedOut: false,
}

describe('exposure gate', () => {
  it('allows a server value for an enrolled, normal identity', () => {
    expect(shouldTrackExposure(server)).toBe(true)
  })
  it('never from the default handler, the timeout or a cache (fromServer false)', () => {
    expect(shouldTrackExposure({ ...server, fromServer: false, style: 'explain_first' })).toBe(false)
  })
  it('never when not enrolled, excluded (test- or ?internal=1) or opted out', () => {
    expect(shouldTrackExposure({ ...server, inExperiment: false })).toBe(false)
    expect(shouldTrackExposure({ ...server, excluded: true })).toBe(false)
    expect(shouldTrackExposure({ ...server, optedOut: true })).toBe(false)
  })
})

describe('exposure tracker', () => {
  it('sends once per session however often it is called', () => {
    const send = vi.fn()
    const t = createExposureTracker(send)
    expect(t.trackOnce(server)).toBe(true)
    expect(t.trackOnce(server)).toBe(false)
    expect(t.trackOnce(server)).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith({ value: 'fix-first', experimentId: 7 })
  })
  it('does not latch on a refused state, so a later valid call can still send', () => {
    const send = vi.fn()
    const t = createExposureTracker(send)
    expect(t.trackOnce({ ...server, fromServer: false })).toBe(false)
    expect(t.sent).toBe(false)
    expect(t.trackOnce(server)).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('a throwing SDK call is swallowed and never retried', () => {
    const send = vi.fn(() => {
      throw new Error('boom')
    })
    const t = createExposureTracker(send)
    expect(t.trackOnce(server)).toBe(false)
    expect(t.trackOnce(server)).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
