# Lintmus

**A linter for Flagsmith experiment code, that runs a real Flagsmith experiment on itself.**

Most broken experiments do not crash. Events are switched off, an exposure is never recorded, or a metric name is
one character off, and the dashboard just says "Collecting data" for two weeks. Lintmus catches those bugs before you
ship: paste your Flagsmith SDK code and it shows each mistake with the reason it breaks the experiment and a fix you
can copy.

Built for the Flagsmith "Toggle Wars" hackathon, Track 1 (Test Something Real).

## What it does

- **Puzzle:** the start screen has a snippet with 3 silent bugs. Find and fix them in 60 seconds.
- **Your own code:** paste JavaScript, TypeScript or Python that uses a Flagsmith SDK. Optionally list your metric
  names so event names can be checked against them exactly.
- **Findings:** each one names the line, explains what goes wrong in the experiment, and gives a corrected snippet
  that uses your metric names.

The linting runs entirely in your browser. The code you paste is never uploaded.

## The rules

| Rule | Catches | What goes wrong |
|---|---|---|
| r01 | `enableEvents` / `enable_events=True` missing in the SDK init | The SDK silently ignores every event call, so nothing is recorded. |
| r02 | A flag read that never records an exposure | The experiment cannot tell who saw which version, so conversions have nothing to compare against. |
| r03 | An event name that does not match a metric, or the `YOUR_METRIC_NAME` placeholder left in | Flagsmith ignores the event without an error and the metric stays at zero. |
| r04 | A short Python script that can exit before buffered events are sent | Recent events are dropped. Long-running servers are not affected. |
| r05 | The SDK initialised twice, or `identify` called with different keys | One visitor becomes two identities, splitting exposures from conversions. |

## The experiment Lintmus runs on itself

Lintmus is also the test subject. Every visitor who sees a finding is in a live Flagsmith experiment on the flag
`finding_style`, split 50/50:

- `explain_first` (control): the explanation is open, the fix is behind "Show fix".
- `fix_first`: the corrected code is open with a Copy button, the explanation is behind "Why?".

Content is identical in both arms; only the order and what is expanded by default differ.

| Metric | Role | Meaning |
|---|---|---|
| `finding_fixed_clean` | Primary | A finding was fixed and the edit did not introduce a new one. |
| `new_finding_after_edit` | Guardrail | An edit created a finding that was not there before (for example a fix pasted next to the old code instead of over it). |
| `finding_resolved` | Informational | Any finding disappeared, clean or not. |
| `fix_copied` | Informational | The Copy button was used. |

The hypothesis is that `fix_first` wins raw resolves almost mechanically, and the real question is whether that
survives once blind-paste errors are counted. The guardrail is there to answer it.

How it is kept honest:

- **Pre-registered.** [EXPERIMENT.md](EXPERIMENT.md) fixes the hypothesis, population, metrics and the ship or refuse
  rule before the experiment starts. Settings are in [experiment.config.json](experiment.config.json).
- **Clean exposures.** An exposure is recorded once per session, only for a value served by Flagsmith inside the
  running experiment. A visitor whose flag times out (1.5 s) sees the control and is never counted. `test-` identities,
  `?internal=1` sessions and visitors who press "Do not track me" are excluded.
- **No half-typed credit.** Metrics are computed only on settled states (4 s idle, a paste or a blur), and a finding
  only counts as fixed if the code it belongs to is still there.
- **Decision rule tested before launch.** A simulator replays the experiment in four worlds (no effect, the minimum
  detectable effect, a harmful variant, a broken traffic split) and checks that the rule ships, holds or refuses as
  it should. Every assumed number is listed in [ASSUMPTIONS.md](ASSUMPTIONS.md); the saved power run is in
  [docs/power-run.txt](docs/power-run.txt).

Only event names go to Flagsmith (the exposure plus the four metrics above). No code, no personal data.

## Run it

Needs Node 22 and pnpm.

```
pnpm install
pnpm test      # 104 tests: rules, metrics, exposure gate, simulator, statistics
pnpm build     # type check and production build
pnpm dev       # local app
```

The app works with no configuration: it shows the control layout and tracks nothing (the footer says so). To connect
it to Flagsmith, copy `.env.example` to `.env` and set `VITE_FLAGSMITH_ENVIRONMENT_KEY` to the client-side key of
your environment.

### Scripts

| Command | What it does |
|---|---|
| `pnpm power` | 1,000 offline reruns of the experiment and the decision rule. No keys needed. |
| `pnpm simulate -- --world mde --seed 42 --n 3000 --dry-run` | One simulated run, offline. Drop `--dry-run` and add `--env sim` to send it to a Flagsmith `sim` environment (refuses `real`). |
| `pnpm expected-loss -- --control-n ... --variant-n ...` | Applies the ship or refuse rule to observed counts. |
| `pnpm ping` | Sends one test event to every Flagsmith environment that has a key in `.env`. |
| `pnpm smoke` | Sends about 120 test identities through the real Node SDK to a running experiment in the `sim` environment. |

## Layout

```
src/lint/          rule engine, rules r01-r05, puzzle snippet
src/experiment/    Flagsmith SDK wiring, identity, exposure gate, settled-state metrics
src/ui/            puzzle, code input, the two finding-card layouts, consent banner
scripts/           simulator, statistics, decision rule, Flagsmith checks
tests/             Vitest suites
```

## Status

The experiment window is Nov 26-29, 2026. Results and the ship or refuse decision will be added here after the
analysis. Until then the simulator numbers come from the assumed model in ASSUMPTIONS.md, not from real visitors.

## License

MIT, see [LICENSE](LICENSE).
