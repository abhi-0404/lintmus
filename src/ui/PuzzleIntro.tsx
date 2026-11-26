export function PuzzleIntro({
  isPuzzle,
  bugsLeft,
  total,
  onReset,
  onOwnCode,
}: {
  isPuzzle: boolean
  bugsLeft: number
  total: number
  onReset: () => void
  onOwnCode: () => void
}) {
  return (
    <section className="intro">
      <h2>3 silent bugs. Find and fix them in 60 seconds.</h2>
      <p>
        This snippet sets up a Flagsmith experiment, but it will record nothing and show no error. Edit the code until
        the findings are gone. Or paste your own code.
      </p>
      <p className="progress" role="status">
        {isPuzzle
          ? bugsLeft === 0
            ? 'Solved: no silent bugs left.'
            : `${total - bugsLeft} of ${total} bugs fixed, ${bugsLeft} to go.`
          : 'Checking your own code.'}
      </p>
      <p className="actions">
        <button type="button" className="button secondary" onClick={onReset}>
          Reset the puzzle
        </button>
        <button type="button" className="button secondary" onClick={onOwnCode}>
          Start with my own code
        </button>
      </p>
    </section>
  )
}
