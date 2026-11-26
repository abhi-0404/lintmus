// Variation layout (fix_first): title, corrected code expanded with Copy, explanation collapsed behind "Why?".
import { CardHeader, Collapsible, FixBlock, WhyBlock } from './cardParts.tsx'
import type { CardProps } from './cardParts.tsx'

export function FindingCardFixFirst({ finding, onCopy }: CardProps) {
  return (
    <article className="card" data-layout="fix_first">
      <CardHeader finding={finding} />
      <section className="card-section" aria-label="Corrected code">
        <h4>Corrected code</h4>
        <FixBlock finding={finding} onCopy={onCopy} />
      </section>
      <Collapsible label="Why this breaks your experiment" openLabel="Hide why" closedLabel="Why?" initiallyOpen={false}>
        <WhyBlock finding={finding} />
      </Collapsible>
    </article>
  )
}
