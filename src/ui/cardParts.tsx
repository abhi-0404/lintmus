// Pieces shared by both card layouts, so the two arms show identical content and buttons.
// The ONLY difference between the arms is the order of these parts and which one starts expanded.
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Finding } from '../lint/types.ts'

export interface CardProps {
  finding: Finding
  /** Called on every Copy click; the metrics layer keeps only the first. */
  onCopy: () => void
}

export function CardHeader({ finding }: { finding: Finding }) {
  return (
    <header className="card-head">
      <span className={`badge badge-${finding.severity}`}>{finding.severity === 'error' ? 'Error' : 'Possible issue'}</span>
      <h3>{finding.title}</h3>
      <span className="line-no">line {finding.line}</span>
    </header>
  )
}

/** A section that can be collapsed behind a button. `open` is only the initial state. */
export function Collapsible({
  label,
  openLabel,
  closedLabel,
  initiallyOpen,
  children,
}: {
  label: string
  openLabel: string
  closedLabel: string
  initiallyOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <section className="card-section" aria-label={label}>
      <button type="button" className="link-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? openLabel : closedLabel}
      </button>
      {open && <div className="card-body">{children}</div>}
    </section>
  )
}

export function WhyBlock({ finding }: { finding: Finding }) {
  return (
    <>
      <p>{finding.why}</p>
      <p>
        <a href={finding.docsUrl} target="_blank" rel="noreferrer">
          Flagsmith Experimentation docs
        </a>
      </p>
    </>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function FixBlock({ finding, onCopy }: CardProps) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')
  return (
    <>
      <pre className="fix">
        <code>{finding.fix}</code>
      </pre>
      <button
        type="button"
        className="button"
        onClick={async () => {
          onCopy()
          setCopied((await copyText(finding.fix)) ? 'ok' : 'failed')
        }}
      >
        {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed, select the text' : 'Copy fix'}
      </button>
    </>
  )
}
