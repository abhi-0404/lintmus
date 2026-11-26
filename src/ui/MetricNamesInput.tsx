export function MetricNamesInput({ value, onChange }: { value: string; onChange: (raw: string) => void }) {
  return (
    <div className="field">
      <label htmlFor="metrics">Metric names in Flagsmith (optional)</label>
      <input
        id="metrics"
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="checkout_completed, signup_done"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="hint">Comma separated. Lets Lintmus catch event names that do not match a metric exactly.</p>
    </div>
  )
}
