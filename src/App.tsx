import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import config from '../experiment.config.json'
import { initExperiment, sendMetric, trackingConfigured } from './experiment/flagsmith.ts'
import type { ExperimentState } from './experiment/flagsmith.ts'
import { changeFraction, createMetricsState, MAX_CHANGE_FRACTION, observeFixCopied, observeSettled, rebase } from './experiment/metrics.ts'
import type { MetricsState } from './experiment/metrics.ts'
import { lint, parseMetricNames } from './lint/engine.ts'
import { PUZZLE_CODE, PUZZLE_METRIC_NAMES } from './lint/samples.ts'
import { CodeInput } from './ui/CodeInput.tsx'
import { ConsentBanner } from './ui/ConsentBanner.tsx'
import { FindingList } from './ui/FindingList.tsx'
import { MetricNamesInput } from './ui/MetricNamesInput.tsx'
import { PuzzleIntro } from './ui/PuzzleIntro.tsx'
import { ShareLine } from './ui/ShareLine.tsx'
import { SimDemoBanner } from './ui/SimDemoBanner.tsx'

const PUZZLE_METRICS_RAW = PUZZLE_METRIC_NAMES.join(', ')
const PUZZLE_TOTAL = lint(PUZZLE_CODE, { metricNames: PUZZLE_METRIC_NAMES }).findings.length

export default function App() {
  const [text, setText] = useState(PUZZLE_CODE)
  const [metricsRaw, setMetricsRaw] = useState(PUZZLE_METRICS_RAW)
  const [mode, setMode] = useState<'puzzle' | 'own'>('puzzle')
  const [experiment, setExperiment] = useState<ExperimentState | null>(null)
  const metricsState = useRef<MetricsState>(createMetricsState())
  const metricNames = useMemo(() => parseMetricNames(metricsRaw), [metricsRaw])

  // Identity-first init, at most flagTimeoutMs. The layout is decided here and never changes afterwards.
  useEffect(() => {
    let cancelled = false
    void initExperiment().then((s) => {
      if (!cancelled) setExperiment(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const result = useMemo(() => lint(text, { metricNames }), [text, metricNames])

  // A settled state (4 s idle, paste, blur). Metrics see nothing else.
  const settle = useCallback(
    (settledText: string) => {
      const r = lint(settledText, { metricNames })
      const next = observeSettled(metricsState.current, settledText, r, metricNames)
      metricsState.current = next.state
      for (const name of next.fire) sendMetric(name, experiment)
    },
    [metricNames, experiment],
  )

  // The first rendered state is the baseline for the metrics (nothing can fire from it).
  useEffect(() => {
    if (metricsState.current.prev === null) settle(PUZZLE_CODE)
  }, [settle])

  const onCopy = useCallback(() => {
    const next = observeFixCopied(metricsState.current)
    metricsState.current = next.state
    for (const name of next.fire) sendMetric(name, experiment)
  }, [experiment])

  const bugsLeft = result.findings.length
  const solved = mode === 'puzzle' && bugsLeft === 0 && changeFraction(text, PUZZLE_CODE) < MAX_CHANGE_FRACTION

  return (
    <>
      <SimDemoBanner />
      <main>
        <header className="site-head">
          <h1>Lintmus</h1>
          <p>Finds the silent bugs that make a Flagsmith experiment record nothing.</p>
        </header>

        <PuzzleIntro
          isPuzzle={mode === 'puzzle'}
          bugsLeft={bugsLeft}
          total={PUZZLE_TOTAL}
          onReset={() => {
            setMode('puzzle')
            setText(PUZZLE_CODE)
            setMetricsRaw(PUZZLE_METRICS_RAW)
            metricsState.current = rebase(metricsState.current, PUZZLE_CODE, lint(PUZZLE_CODE, { metricNames: PUZZLE_METRIC_NAMES })) // a fresh baseline, not an edit
          }}
          onOwnCode={() => {
            setMode('own')
            setText('')
            setMetricsRaw('')
            metricsState.current = rebase(metricsState.current, '', lint('', { metricNames: [] })) // a fresh baseline, not an edit
          }}
        />

        <div className="workspace">
          <div className="col">
            <CodeInput value={text} onChange={setText} onSettled={settle} idleMs={config.settle.idleMs} />
            <MetricNamesInput
              value={metricsRaw}
              onChange={(raw) => {
                setMetricsRaw(raw)
                // Changing the metric list changes findings without an edit to the code: new baseline, nothing fires.
                metricsState.current = rebase(metricsState.current, text, lint(text, { metricNames: parseMetricNames(raw) }))
              }}
            />
          </div>
          <div className="col">
            <h2 className="findings-title">Findings{bugsLeft > 0 ? ` (${bugsLeft})` : ''}</h2>
            {experiment === null ? (
              <p className="hint">Checking your code...</p>
            ) : bugsLeft > 0 ? (
              <FindingList findings={result.findings} experiment={experiment} onCopy={onCopy} />
            ) : (
              <p className="all-clear">
                {text.trim() === '' ? 'Paste some Flagsmith code to check it.' : 'No silent bugs found in this code.'}
              </p>
            )}
            {solved && <ShareLine fixed={PUZZLE_TOTAL} />}
          </div>
        </div>

        <ConsentBanner />
        <footer>
          <p>
            Five rules: events not enabled, no exposure recorded, event name mismatch, Python events dropped at exit,
            duplicate init or identify. Open source, MIT.
            {!trackingConfigured && ' Tracking is off in this build (no Flagsmith key).'}
          </p>
        </footer>
      </main>
    </>
  )
}
