// Control layout (explain_first): title, explanation expanded with docs link, fix collapsed behind "Show fix".
import { CardHeader, Collapsible, FixBlock, WhyBlock } from './cardParts.tsx'
import type { CardProps } from './cardParts.tsx'

export function FindingCardExplainFirst({ finding, onCopy }: CardProps) {
  return (
    <article className="card" data-layout="explain_first">
      <CardHeader finding={finding} />
      <section className="card-section" aria-label="Why this breaks your experiment">
        <h4>Why this breaks your experiment</h4>
        <WhyBlock finding={finding} />
      </section>
      <Collapsible label="Corrected code" openLabel="Hide fix" closedLabel="Show fix" initiallyOpen={false}>
        <FixBlock finding={finding} onCopy={onCopy} />
      </Collapsible>
    </article>
  )
}
