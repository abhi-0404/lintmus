const KEY = 'lintmus_identity'

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}

/** Anonymous identity: a GUID kept in localStorage, created before the SDK init. Never throws. */
export function getIdentity(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
    const id = newId()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return newId() // storage blocked: a fresh id per page load (stated in the README honesty box)
  }
}

/** Identities with this prefix never count toward the experiment (they never track exposure). */
export function isExcludedIdentity(identity: string, prefix = 'test-'): boolean {
  return identity.startsWith(prefix)
}

/** Sessions opened with ?internal=1 never call trackExposureEvent. */
export function isInternalSession(search: string, param = 'internal'): boolean {
  return new URLSearchParams(search).get(param) === '1'
}
