# Lintmus

**A linter for Flagsmith experiment code, that runs a real Flagsmith experiment on itself.**

Most broken experiments do not crash. Events are switched off, an exposure is never recorded, or a metric name is
one character off, and the dashboard just says "Collecting data" for two weeks. Lintmus catches those bugs before you
ship: paste your Flagsmith SDK code and it shows each mistake with the reason it breaks the experiment and a fix you
can copy.

Built for the Flagsmith "Toggle Wars" hackathon, Track 1 (Test Something Real).

## Live

- App (the real experiment, Flagsmith environment `real`): https://lintmus.vercel.app
- Simulation demo (environment `sim`, shows a red "SIMULATION DEMO" banner, never used for the real result): https://lintmus-sim-demo.vercel.app

Both returned HTTP 200 on Nov 27, 2026. Which Flagsmith key each deployment is built with is set in the Vercel project
settings, which are not in the repo: UNVERIFIED from the repo (`.env.example` documents the intent: `real` for lintmus,
`sim` for lintmus-sim-demo).

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
  rule before the experiment starts. Settings are in [experiment.config.json](experiment.config.json). A win needs
  Flagsmith's chance to beat control above 95% and a 95% credible interval that excludes 0 (together about 97.5%
  one-sided), an expected loss of shipping under 0.5 points, and a guardrail that is measured and not losing.
- **Clean exposures.** An exposure is recorded once per session, only for a value served by Flagsmith inside the
  running experiment. A visitor whose flag times out (1.5 s) sees the control and is never counted. `test-` identities,
  `?internal=1` sessions and visitors who press "Do not track me" are excluded.
- **No half-typed credit.** Metrics are computed only on settled states (4 s idle, a paste or a blur), and a finding
  only counts as fixed if the code it belongs to is still there.
- **Decision rule tested before launch.** A simulator replays the experiment in four worlds (no effect, the minimum
  detectable effect, a harmful variant, a broken traffic split) and checks that the rule ships, holds or refuses as
  it should. The results, including the one world where it fails, are in [Simulated worlds](#simulated-worlds-simulated-not-real-visitors).
  Every assumed number is listed in [ASSUMPTIONS.md](ASSUMPTIONS.md); the saved power run is in
  [docs/power-run.txt](docs/power-run.txt).

Only event names go to Flagsmith (the exposure plus the four metrics above). No code, no personal data.

## How Flagsmith is used

Flagsmith is the core of the project, not an add-on. The visitor-facing layout is decided by a Flagsmith multivariate
flag, the success metric comes from real events sent to Flagsmith, and the ship or refuse decision follows Flagsmith's
Bayesian experiment results (plus a stricter pre-registered rule of our own).

### Flag, variants and environments

| Surface | Detail | Where |
|---|---|---|
| Flag | `finding_style`, multivariate, 50/50 | `experiment.config.json` |
| Control | value `explain_first` (no variation key; the SDK reports `variant` as `"control"`, verified on Flagsmith Cloud) | `experiment.config.json`, `docs/sdk-facts.md` |
| Variation | key `fix-first`, value `fix_first` | `experiment.config.json` |
| Environment `real` | The live experiment, Flagsmith experiment id 725, started 2026-11-27 00:57 IST, fixed analysis time 2026-11-29 11:00 IST | `EXPERIMENT.md`, `DECISION.md` |
| Environment `sim` | Simulated worlds only (smoke 721, A/A 740, MDE 747, harm 1415, SRM 1416, SRM extra 1425). The simulator refuses to send to `real` | `docs/results/sim-worlds.md`, `scripts/simulate.ts:93` |
| Lock scope | A `sim` experiment on `finding_style` ran while `real` experiment 725 was running on the same flag, so the one-running-experiment lock is per environment | `docs/results/sim-worlds.md` |

### Keys (never committed)

| Key | How it is supplied |
|---|---|
| Browser app, client-side environment key | Build-time variable `VITE_FLAGSMITH_ENVIRONMENT_KEY` (read at `src/experiment/flagsmith.ts:23`), set in a git-ignored `.env` locally and in the Vercel project settings for the deployments (Vercel side UNVERIFIED from the repo). With no key the app shows the control layout, tracks nothing and says so in the footer (`flagsmith.ts:72`, `:163`). |
| Node scripts, one key per environment | `FLAGSMITH_ENV_KEY_<ENV>` (for example `FLAGSMITH_ENV_KEY_SIM`) from the git-ignored `.env`, read in `scripts/simulate.ts:94-96`. `.env.example` lists the variable names only, with no values. |
| Optional self-hosted overrides | `VITE_FLAGSMITH_API_URL`, `VITE_FLAGSMITH_EVENTS_API_URL` (browser), `FLAGSMITH_API_URL`, `FLAGSMITH_EVENTS_API_URL` (scripts). Not used for the Cloud runs. |

`.env` is git-ignored and not tracked; only `.env.example` is tracked.

### Metrics (Flagsmith Occurrence events, one per identity)

| Metric | Role | Direction | Attached in Flagsmith experiment 725 |
|---|---|---|---|
| `finding_fixed_clean` | Primary | up (expected direction: increase) | Yes, the only metric |
| `new_finding_after_edit` | Guardrail | down (expected direction: not increase) | No. The experiment wizard accepts one metric, so the guardrail is read from raw events with our CLI (`DECISION.md` deviation 2) |
| `finding_resolved` | Informational | none | No |
| `fix_copied` | Informational (manipulation check) | none | No |

Metric logic is one pure, unit-tested module: `src/experiment/metrics.ts`. Events fire only on settled states (4 s idle, a paste or a blur).

### SDK calls

Browser app, `@flagsmith/flagsmith` 12.6.0 (all wiring is in one file):

| Call | File:line | Purpose |
|---|---|---|
| `flagsmith.init({ environmentID, identity, enableEvents: true, cacheFlags: false, defaultFlags, onError, ... })` | `src/experiment/flagsmith.ts:74-86` (`environmentID` :75, `identity` :76, `enableEvents` :77, `cacheFlags` :78, `defaultFlags` :80) | Identity is passed in init, so identity-scoped flags load before anything renders. `enableEvents: true` is what makes tracking work at all. `cacheFlags: false` because a cached value is not a server value. `defaultFlags` is the default handler and always serves the control `explain_first`. Raced against a 1.5 s timeout (`:88-99`, `flagTimeoutMs`); on timeout or error the session stays on the control and never records an exposure. |
| `flagsmith.loadingState?.source` | `flagsmith.ts:105` | Only `SERVER` counts as a real value (not `DEFAULT_FLAGS`, not `CACHE`). |
| `flagsmith.getAllFlags()[FLAG]` | `flagsmith.ts:106` | Reads value, `variant`, `experiment.inExperiment` and `experiment.id`. Used instead of `getExperimentFlag` on purpose, because `getExperimentFlag` records its own exposure and the exposure must fire from one controlled place. |
| `flagsmith.trackExposureEvent('finding_style', { value, metadata: { experiment_id } })` | `flagsmith.ts:145` (called through `exposure.trackOnce` at `src/ui/FindingList.tsx:40`; gate in `src/experiment/exposure.ts:25-27`) | One exposure per session, when the first finding card is about to render, only for a server value from an identity enrolled in a running experiment, never for `test-` identities, `?internal=1` sessions or visitors who opted out. |
| `flagsmith.trackEvent(name)` | `flagsmith.ts:155` (called by `sendMetric` from `src/App.tsx:47` and `:60`) | The four metrics. A no-op unless the value came from the server. |
| `flagsmith.flushEvents()` | `flagsmith.ts:122` | On `visibilitychange` to hidden and on bfcache `pagehide`. The SDK has no unload handling of its own. |
| `flagsmith.close(1000)` | `flagsmith.ts:133` | On a real `pagehide`; the browser `close` requires the timeout argument. |

Node scripts, `@flagsmith/nodejs` 9.5.0 (simulator and checks; they run only in `sim`, never in `real`):

| Call | File:line | Purpose |
|---|---|---|
| `new Flagsmith({ environmentKey, enableEvents: true, eventProcessorConfig, defaultFlagHandler })` | `scripts/lib.ts:27-35` (`enableEvents` :30, `defaultFlagHandler` :34) | Shared client factory. Node throws if events are off, unlike the browser. |
| `client.getIdentityFlags(identity)` | `scripts/simulate.ts:109` | Arm assignment always comes from Flagsmith. The model only decides behaviour. |
| `client.trackExposureEvent('finding_style', { identifier, value, metadata: { experiment_id } })` | `scripts/simulate.ts:129` | Same payload shape the app sends, only for identities enrolled in the running experiment. |
| `client.trackEvent(metric, { identifier })` | `scripts/simulate.ts:131`; `scripts/smoke.ts:45`, `:49`; `scripts/prework-ping.ts:22` | Metric events for simulated identities, the smoke run and the pre-work ping. |
| `client.flushEvents()` | `scripts/simulate.ts:140` | Send the buffer before exit. |
| `client.close(30_000)` | `scripts/simulate.ts:142`; `scripts/smoke.ts:56` (`close(15_000)`); `scripts/prework-ping.ts:24` (`close(10_000)`) | Required before a short script exits, or buffered events are dropped. |

The events pipeline is marked experimental in the SDK types (`docs/sdk-facts.md`), so these signatures may move.

### Experiments

| Experiment | Environment | What it is | Status |
|---|---|---|---|
| 725 | `real` | The real experiment: `finding_style`, primary `finding_fixed_clean`, real visitors | Running; analysis 2026-11-29 11:00 IST |
| 721 | `sim` | Smoke experiment, about 120 identities, to learn the Flagsmith UI behaviour | Done (`docs/sdk-facts.md`) |
| 740 | `sim` | Simulated A/A world | Completed, control rolled out |
| 747 | `sim` | Simulated MDE world | Completed, control rolled out |
| 1415 | `sim` | Simulated harm world | Completed, control rolled out |
| 1416 | `sim` | Simulated SRM world, pre-registered 10% exposure drop | Completed, control rolled out |
| 1425 | `sim` | Simulated SRM world, 20% exposure drop (labelled extra, not pre-registered) | Completed, control rolled out |

### What Flagsmith computes and what our CLI computes

| Flagsmith (dashboard) | Our CLI (`pnpm expected-loss`, `scripts/expected-loss.ts`) |
|---|---|
| Assignment (50/50 by identity hash), enrolment, exposures per arm | Nothing: it takes counts as input |
| Occurrence rate, win probability, delta and 95% credible interval for the primary metric | Its own Beta-Binomial reading with a uniform Beta(1,1) prior, labelled "NOT Flagsmith's number" in every output (Flagsmith's prior is not documented in the repo, so the two can differ slightly) |
| "Collecting data" until 50 identities and 5 conversions per arm | The same floors, read from `experiment.config.json` |
| No SRM warning was shown in any `sim` world, even at a 55/45 split on a 50/50 rollout (threshold, if any, not documented) | Own chi-square SRM p-value, informational; the pre-registered rule voids only on Flagsmith's warning, so the analysis runbook reports this p by hand |
| A default recommendation banner ("Consider rolling out ... to all users") based on the primary metric only | The pre-registered 5-row ship or refuse rule: win needs chance to beat control above 95%, a 95% credible interval that excludes 0, expected loss of shipping under 0.5 points, and a guardrail with at least 5 events per arm that is not losing |
| Nothing for the guardrail (not attachable, see above) | Guardrail difference in points from raw counts (loses if worse by more than 3 points) |

The decision rule is in [EXPERIMENT.md](EXPERIMENT.md) section 8, fixed before the experiment started (commit 6b82376,
2026-11-26 17:04 IST; real start 2026-11-27 00:57 IST).

## Simulated worlds (SIMULATED, not real visitors)

**Everything in this section is SIMULATED traffic.** The simulation validates the design and the decision rule; it
says nothing about developers. Each world is its own experiment in the `sim` environment on `finding_style` (100%
rollout, 50/50, primary `finding_fixed_clean`, increase), with 3,000 identities sent through the real
`@flagsmith/nodejs` SDK (`pnpm simulate -- --world <w> --seed 42 --n 3000 --env sim`), then read in Flagsmith next to
our own rule, then completed with "Roll out control". Run on 2026-11-27 (IST). Full write-up, rule outputs and
screenshots: [docs/results/sim-worlds.md](docs/results/sim-worlds.md).

| World | Sent (SIMULATED) | Flagsmith reading | Our rule | Must show | Result |
|---|---|---|---|---|---|
| A/A (740) | explain_first 1,521 exposed, 507 clean fixes (33.3%); fix_first 1,479 exposed, 527 (35.6%). Guardrail 10 vs 12 | fix-first +6.9%, 95% CrI [-3.7%, 17.5%], 90% chance to be best; banner "90% Winner Probability Confirmed. Consider rolling out fix-first to all users." No SRM warning | RULE 5 INCONCLUSIVE (chance to beat 90.8%, interval includes 0) | No winner | PASS |
| MDE (747) | explain_first 1,486 exposed, 509 (34.3%); fix_first 1,514 exposed, 618 (40.8%). Guardrail 13 vs 27 | fix-first +19.2%, 95% CrI [8.1%, 30.3%], > 99% chance to be best | RULE 4 WIN (chance to beat 99.99%, CrI [3.11, 10.01] pts, guardrail not losing) | A win | PASS, both agree |
| Harm (1415) | explain_first 1,550 exposed, 535 (34.5%); fix_first 1,450 exposed, 632 (43.6%). Guardrail 6 vs 91 (0.4% vs 6.3%) | fix-first +26.3%, 95% CrI [14.9%, 37.7%], > 99%; banner "Consider rolling out fix-first to all users." | RULE 3 LOSE (guardrail worse by 5.89 points, limit 3) | Lose despite a better primary | PASS; Flagsmith alone would ship |
| SRM, 10% drop (1416) | explain_first 1,487 exposed, 493 (33.2%); fix_first 1,513 assigned, 1,364 exposed, 566 (41.5%). Guardrail 7 vs 28 | Split shown 52% / 48%, fix-first +25.2%, > 99%. No SRM warning | RULE 4 WIN (own SRM p = 0.021) | SRM warning, void | FAIL |
| SRM extra, 20% drop (1425, not pre-registered) | explain_first 1,490 exposed, 497 (33.4%); fix_first 1,510 assigned, 1,200 exposed, 506 (42.2%). Guardrail 8 vs 24 | Split shown 55% / 45%, fix-first +26.4%, 95% CrI [14.1%, 38.8%], > 99%. No SRM warning | RULE 4 WIN, with the script's NOTE (own SRM p = 2.3e-8) | SRM warning, void | FAIL |

### What the worlds show

- **A/A: the default banner ships noise.** The variant is ignored by the simulated visitors, so there is no true
  difference. Flagsmith's banner still recommended shipping at 90%. The pre-registered rule (above 95% and an
  interval that excludes 0) refused: INCONCLUSIVE, nothing ships.
- **Harm: the guardrail is what stops a bad ship.** The harmful variant also improves the primary metric, so
  Flagsmith, which judges only the primary (the guardrail cannot be attached, `DECISION.md` deviation 2), says
  "> 99% Winner" and suggests rolling it out, while blind-paste errors become 16 times more common. The pre-registered
  guardrail clause refuses it: LOSE.
- **SRM: a broken split gets through.** With 10% or 20% of the variant's exposures lost, Flagsmith showed no sample
  ratio mismatch warning, and our rule, which voids only on that warning, called both a WIN. See the finding below.

## Honesty box and limits

What this project does not claim, and where it can be wrong.

**Real result**
- The real experiment can easily end inconclusive. Expected traffic was 45-175 exposed identities; at 50 per arm only
  a lift above roughly +75% relative is usually decisive, and the pre-registration puts a decisive real result under
  25% (`EXPERIMENT.md` section 6). The rule treats "inconclusive" and "below minimum" as valid outcomes that do not ship.
- Late start (`DECISION.md` deviation 1): planned 2026-11-26 16:00 IST, actual 2026-11-27 00:57 IST because Flagsmith
  Cloud keys and the Vercel deploy were not ready. The window to the unchanged analysis time (2026-11-29 11:00 IST) is
  about 58 hours instead of 67. Thresholds are unchanged.
- The guardrail is not attached in Flagsmith (`DECISION.md` deviation 2): the experiment wizard accepts one metric, so
  the dashboard clause "Flagsmith marks the guardrail losing" cannot fire. The guardrail is judged from raw
  `new_finding_after_edit` counts with `scripts/expected-loss.ts`, labelled "not Flagsmith's number". Where those
  per-arm raw counts will be read from on Nov 29 is UNVERIFIED (`docs/analysis-runbook.md`); if none is available the
  guardrail counts as unmeasured and a win is impossible by the rule.
- At real N the guardrail interval is about plus or minus 7 points, so on real traffic the guardrail can block a ship
  but cannot certify safety. The clean-fix primary carries the safety burden (`EXPERIMENT.md` section 9).
- Fixing code in a text box understates real fixing, because people fix in their IDE, and more so in `explain_first`.
  This biases toward `fix_first`. We state it first so nobody has to find it.
- The population is mostly puzzle players on the sample snippet, many not Flagsmith users. The estimand is the effect
  on that mixed population. `source = own_code` is described from raw counts only and is exploratory.
- Lint rules are frozen at start. Any change to layouts, exposure or metric code after start voids the result.
  False-positive rule fixes are allowed, apply to both arms and are logged in `DECISION.md` (currently: none).
- The Python lint rules r02 and r04 use SDK method names that were not verified against an installed Python SDK, so
  r04 is labelled "Possible issue" (`docs/sdk-facts.md`).

**Simulation**
- Every simulation parameter is ASSUMED, not measured, and was tuned to hit the pre-registered targets (35% baseline,
  +18% relative lift in the MDE world, a guardrail loss above 3 points in the harm world). "The MDE world shows a
  lift" is therefore true by construction. What the worlds test is the machinery: the pipeline, the metrics,
  Flagsmith's numbers and our decision rule (`ASSUMPTIONS.md`).
- The harm world's primary metric also improves (+22% in the model). That is deliberate: it shows the guardrail, not
  the primary, is what stops the ship.
- No real-user distribution of experience, patience or bug count is known.
- Simulated numbers are never mixed with the real result.

**Finding: the SRM gap in our own pre-registered rule**
- The rule voids a result only on Flagsmith's SRM warning. Before the live runs, an offline dry run already showed the
  risk: a 10% drop gives our own chi-square p around 0.03, so a strict SRM check would stay quiet.
- Live, it was worse than that: Flagsmith showed no SRM warning at a 52/48 split (pre-registered 10% drop, own p =
  0.021) or at a 55/45 split (20% drop extra, own p = 2.3e-8). Either Flagsmith runs no SRM check, or it does not show
  one on this page. Our rule called both broken experiments a WIN. Reported as a FAIL.
- What we did: the rule itself is unchanged, because it is pre-registered. `pnpm expected-loss` prints our own SRM
  p-value and a NOTE when p < 0.01 without a Flagsmith warning. The analysis runbook adds a manual SRM check for the
  real result: the script's own p is reported next to the verdict, and p < 0.01 is flagged as "SRM suspected"
  (`docs/analysis-runbook.md` section 2). The flag informs readers; it does not change the matched row.
- Lesson for the next experiment: the rule should run its own SRM check (for example p < 0.01 voids) instead of
  relying on the platform's warning.

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
docs/              analysis runbook, simulated results, SDK facts, hand-off notes
```

## Results

The experiment window is Nov 27-29, 2026. The real result will be filled in here after the analysis on 2026-11-29 at
11:00 IST, following `docs/analysis-runbook.md` and recorded in [DECISION.md](DECISION.md) ("Final result"). The rule
is applied top to bottom and the first match wins.

| | explain_first (control) | fix_first |
|---|---|---|
| Exposed identities (Flagsmith) | TBD | TBD |
| `finding_fixed_clean` (Flagsmith) | TBD | TBD |
| Win probability, delta and 95% credible interval (Flagsmith) | baseline | TBD |
| `new_finding_after_edit` events (our reading, not Flagsmith's number) | TBD | TBD |
| Own chi-square SRM p (our reading, informational) | TBD | |

- Matched rule row and outcome: TBD
- Action taken in Flagsmith (experiment 725, flag `finding_style`): TBD
- Screenshot: `docs/results/2026-11-29-real-results.jpg` (to be added)

These are REAL visitors. Nothing in "Simulated worlds" is a real result.

## License

MIT, see [LICENSE](LICENSE).
