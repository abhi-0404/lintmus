// The parent of every finding card. The exposure is fired HERE, once per session, when the first finding
// is about to render and before a card component is chosen, so a card that crashes cannot skip it
// (EXPERIMENT.md section 3.4). The layout comes from the state fixed at init and never switches.
import { Component } from 'react'
import type { ReactNode } from 'react'
import { exposure, withCurrentOptOut } from '../experiment/flagsmith.ts'
import type { ExperimentState } from '../experiment/flagsmith.ts'
import type { Finding } from '../lint/types.ts'
import { FindingCardExplainFirst } from './FindingCardExplainFirst.tsx'
import { FindingCardFixFirst } from './FindingCardFixFirst.tsx'

/** A crashing card shows its title only; it must never take the page (or the exposure) down with it. */
class CardBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <article className="card">
        <h3>{this.props.title}</h3>
      </article>
    ) : (
      this.props.children
    )
  }
}

export function FindingList({
  findings,
  experiment,
  onCopy,
}: {
  findings: Finding[]
  experiment: ExperimentState
  onCopy: () => void
}) {
  if (findings.length > 0) {
    try {
      exposure.trackOnce(withCurrentOptOut(experiment)) // latched: a no-op after the first send
    } catch {
      // tracking must never break rendering
    }
  }
  const Card = experiment.style === 'fix_first' ? FindingCardFixFirst : FindingCardExplainFirst
  return (
    <ol className="finding-list" aria-live="polite">
      {findings.map((f) => (
        <li key={f.id}>
          <CardBoundary title={f.title}>
            <Card finding={f} onCopy={onCopy} />
          </CardBoundary>
        </li>
      ))}
    </ol>
  )
}
