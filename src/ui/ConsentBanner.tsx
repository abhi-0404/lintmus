import { useState } from 'react'
import { setOptedOut } from '../experiment/flagsmith.ts'

const KEY = 'lintmus_notice_dismissed'

function dismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Notice about the anonymous experiment data, with an opt-out. The pasted code is never sent anywhere. */
export function ConsentBanner() {
  const [hidden, setHidden] = useState(dismissed)
  if (hidden) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // storage blocked: the notice returns next visit
    }
    setHidden(true)
  }
  return (
    <aside className="consent" aria-label="Privacy notice">
      <p>
        Lintmus runs a Flagsmith experiment on its own cards. It stores a random anonymous ID in this browser and
        sends Flagsmith which version you saw and whether a fix landed. Your code is never sent.
      </p>
      <p className="actions">
        <button type="button" className="button" onClick={close}>
          Got it
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setOptedOut(true)
            close()
          }}
        >
          Do not track me
        </button>
      </p>
    </aside>
  )
}
