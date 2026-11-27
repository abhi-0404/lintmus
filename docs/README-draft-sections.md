<!--
DRAFT sections for README.md. The owner merges these; README.md itself is untouched.
Sources: EXPERIMENT.md, DECISION.md, ASSUMPTIONS.md, experiment.config.json, docs/sdk-facts.md,
docs/results/sim-worlds.md, and the code at the file:line references below (line numbers as of Nov 27, 2026;
re-check them if any file changes). Every simulated number is copied from docs/results/sim-worlds.md.
Items marked UNVERIFIED could not be confirmed from files on disk.
-->

## Live

- App (the real experiment, Flagsmith environment `real`): https://lintmus.vercel.app
- Simulation demo (environment `sim`, shows a red "SIMULATION DEMO" banner, never used for the real result): https://lintmus-sim-demo.vercel.app

Both returned HTTP 200 on Nov 27, 2026 (`docs/HANDOFF.md`). Which Flagsmith key each deployment is built with is set in the Vercel project settings, which are not in the repo: UNVERIFIED from disk (`.env.example` documents the intent: `real` for lintmus, `sim` for lintmus-sim-demo).

## How Flagsmith is used

Flagsmith is the core of the project, not an add-on. The visitor-facing layout is decided by a Flagsmith multivariate flag, the success metric comes from real events sent to Flagsmith, and the ship or refuse decision follows Flagsmith's Bayesian experiment results (plus a stricter pre-registered rule of our own).

### Flag, variants and environments

| Surface | Detail | Where |
|---|---|---|
| Flag | `finding_style`, multivariate, 50/50 | `experiment.config.json` |
| Control | value `explain_first` (no variation key; the SDK reports `variant` as `"control"`, verified on Flagsmith Cloud) | `experiment.config.json`, `docs/sdk-facts.md` |
| Variation | key `fix-first`, value `fix_first` | `experiment.config.json` |
| Environment `real` | The live experiment, Flagsmith experiment id 725, started 2026-11-27 00:57 IST, fixed analysis time 2026-11-29 11:00 IST | `EXPERIMENT.md`, `DECISION.md` |
| Environment `sim` | Simulated worlds only (A/A experiment 740, MDE, and the smoke experiment 721). The simulator refuses to send to `real` | `docs/results/sim-worlds.md`, `scripts/simulate.ts:93` |
| Lock scope | A `sim` experiment on `finding_style` ran while `real` experiment 725 was running on the same flag, so the one-running-experiment lock is per environment | `docs/results/sim-worlds.md` |

### Keys (never committed)

| Key | How it is supplied |
|---|---|
| Browser app, client-side environment key | Build-time variable `VITE_FLAGSMITH_ENVIRONMENT_KEY` (read at `src/experiment/flagsmith.ts:23`), set in a git-ignored `.env` locally and in the Vercel project settings for the deployments (Vercel side UNVERIFIED from disk). With no key the app shows the control layout, tracks nothing and says so in the footer (`flagsmith.ts:72`, `:163`). |
| Node scripts, one key per environment | `FLAGSMITH_ENV_KEY_<ENV>` (for example `FLAGSMITH_ENV_KEY_SIM`) from the git-ignored `.env`, read in `scripts/simulate.ts:94-96`. `.env.example` lists the variable names only, with no values. |
| Optional self-hosted overrides | `VITE_FLAGSMITH_API_URL`, `VITE_FLAGSMITH_EVENTS_API_URL` (browser), `FLAGSMITH_API_URL`, `FLAGSMITH_EVENTS_API_URL` (scripts). Not used for the Cloud runs. |

`.env` is git-ignored and not tracked; only `.env.example` is tracked (checked Nov 27, `docs/submission-checklist.md`).

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
| 740 | `sim` | Simulated A/A world | Complete |
| "SIM world MDE (seed 42, n 3000)" | `sim` | Simulated MDE world (experiment id not recorded on disk) | Data complete; Flagsmith reading pending |
| Harm, SRM | `sim` | Simulated harm and broken-split worlds | Not run live yet |

### What Flagsmith computes and what our CLI computes

| Flagsmith (dashboard) | Our CLI (`pnpm expected-loss`, `scripts/expected-loss.ts`) |
|---|---|
| Assignment (50/50 by identity hash), enrolment, exposures per arm | Nothing: it takes counts as input |
| Occurrence rate, win probability, delta and 95% credible interval for the primary metric | Its own Beta-Binomial reading with a uniform Beta(1,1) prior, labelled "NOT Flagsmith's number" in every output (Flagsmith's prior is not documented in the repo, so the two can differ slightly) |
| "Collecting data" until 50 identities and 5 conversions per arm | The same floors, read from `experiment.config.json` |
| SRM warning (threshold not documented in the repo) | Own chi-square SRM p-value, informational only; the pre-registered rule voids only on Flagsmith's warning |
| A default recommendation banner (see the A/A world below) | The pre-registered 5-row ship or refuse rule: win needs chance to beat control above 95%, a 95% credible interval that excludes 0, expected loss of shipping under 0.5 points, and a guardrail with at least 5 events per arm that is not losing |
| Nothing for the guardrail (not attachable, see above) | Guardrail difference in points from raw counts (loses if worse by more than 3 points) |

The decision rule is in [EXPERIMENT.md](EXPERIMENT.md) section 8, fixed before the experiment started (commit 6b82376, 2026-11-26 17:04 IST; real start 2026-11-27 00:57 IST).

## Simulated worlds (SIMULATED, not real visitors)

**Everything in this section is SIMULATED traffic.** The simulation validates the design and the decision rule; it says nothing about developers. Each world is its own experiment in the `sim` environment on `finding_style` (100% rollout, 50/50, primary `finding_fixed_clean`, increase), with 3,000 identities sent through the real `@flagsmith/nodejs` SDK (`pnpm simulate -- --world <w> --seed 42 --n 3000 --env sim`), then read in Flagsmith next to our own rule. Run on 2026-11-27 (IST). Logs and screenshots: `docs/results/`.

| World | Sent (SIMULATED) | Flagsmith reading | Our rule | Must show | Result |
|---|---|---|---|---|---|
| A/A (experiment 740) | explain_first 1,521 exposed, 507 clean fixes (33.3%); fix_first 1,479 exposed, 527 (35.6%). Guardrail 10 vs 12 (0.66% vs 0.81%) | fix-first +6.9%, 95% CrI [-3.7%, 17.5%], 90% chance to be best; banner "90% Winner Probability Confirmed. Consider rolling out fix-first to all users." No SRM warning | RULE 5 INCONCLUSIVE (chance to beat 90.8% is not above 95%, interval includes 0). Expected loss of shipping 0.075 points | No winner, SRM quiet | PASS under our rule |
| MDE, seed 42 | explain_first 1,486 exposed, 509 clean fixes (34.3%); fix_first 1,514 exposed, 618 (40.8%). Guardrail 13 vs 27 (0.9% vs 1.8%). Lift +19.2%. 0 errors | Pending (not yet read) | RULE 4 WIN (chance to beat 99.99%, 95% CrI [3.11, 10.01] pts, expected loss 0.000, guardrail measured and not losing; own SRM p = 0.609) | A win | PASS under our rule; Flagsmith side pending |
| Harm | Pending (not run live) | Pending | Pending | Lose despite a better primary (guardrail worse by more than 3 points) | Pending |
| SRM | Pending (not run live) | Pending | Pending | SRM warning, rule voids | Pending |

### The A/A story

On the A/A world the variant is ignored by the simulated visitors, so there is no true difference. Flagsmith's own banner still recommended shipping: "90% Winner Probability Confirmed. Consider rolling out fix-first to all users." The pre-registered rule refused. A win needs more than 95% chance to beat control and a 95% credible interval that excludes 0 (together about 97.5% one-sided); here the chance to beat control was 90.8% and the interval included 0, so the outcome was INCONCLUSIVE and nothing ships. This is the reason the rule exists: the default dashboard banner would have shipped a no-effect change.

Offline dry runs of the remaining worlds (a seeded coin instead of Flagsmith's identity hashing, so live counts will differ) give the expected readings: harm RULE 3 LOSE (guardrail +4.99 pts, over the 3-point limit), SRM RULE 4 WIN unless Flagsmith warns (see the SRM-gap finding below). These are dry-run expectations, not Flagsmith results (`docs/results/sim-worlds.md`).

## Honesty box and limits

What this project does not claim, and where it can be wrong.

**Real result**
- The real experiment can easily end inconclusive. Expected traffic was 45-175 exposed identities; at 50 per arm only a lift above roughly +75% relative is usually decisive, and the pre-registration puts a decisive real result under 25% (`EXPERIMENT.md` section 6). The rule treats "inconclusive" and "below minimum" as valid outcomes that do not ship.
- Late start (`DECISION.md` deviation 1): planned 2026-11-26 16:00 IST, actual 2026-11-27 00:57 IST because Flagsmith Cloud keys and the Vercel deploy were not ready. The window to the unchanged analysis time (2026-11-29 11:00 IST) is about 58 hours instead of 67. Thresholds are unchanged.
- The guardrail is not attached in Flagsmith (`DECISION.md` deviation 2): the experiment wizard accepts one metric, so the dashboard clause "Flagsmith marks the guardrail losing" cannot fire. The guardrail is judged from raw `new_finding_after_edit` counts with `scripts/expected-loss.ts`, labelled "not Flagsmith's number". Where those per-arm raw counts will be read from on Nov 29 is UNVERIFIED (`docs/analysis-runbook.md`); if none is available the guardrail counts as unmeasured and a win is impossible by the rule.
- At real N the guardrail interval is about plus or minus 7 points, so on real traffic the guardrail can block a ship but cannot certify safety. The clean-fix primary carries the safety burden (`EXPERIMENT.md` section 9).
- Fixing code in a text box understates real fixing, because people fix in their IDE, and more so in `explain_first`. This biases toward `fix_first`. We state it first so nobody has to find it.
- The population is mostly puzzle players on the sample snippet, many not Flagsmith users. The estimand is the effect on that mixed population. `source = own_code` is described from raw counts only and is exploratory.
- Lint rules are frozen at start. Any change to layouts, exposure or metric code after start voids the result. False-positive rule fixes are allowed, apply to both arms and are logged in `DECISION.md` (currently: none).
- The Python lint rules r02 and r04 use SDK method names that were not verified against an installed Python SDK, so r04 is labelled "Possible issue" (`docs/sdk-facts.md`).

**Simulation**
- Every simulation parameter is ASSUMED, not measured, and was tuned to hit the pre-registered targets (35% baseline, +18% relative lift in the MDE world, a guardrail loss above 3 points in the harm world). "The MDE world shows a lift" is therefore true by construction. What the worlds test is the machinery: the pipeline, the metrics, Flagsmith's numbers and our decision rule (`ASSUMPTIONS.md`).
- The harm world's primary metric also improves (+22% in the model). That is deliberate: it shows the guardrail, not the primary, is what stops the ship.
- No real-user distribution of experience, patience or bug count is known.
- Simulated numbers are never mixed with the real result.

**Finding: the SRM gap in our own pre-registered rule**
- The rule voids a result only on Flagsmith's SRM warning. In the simulated SRM world, 10% of `fix_first` exposures are dropped, which gives our own chi-square p = 0.033 (offline dry run: 1,483 vs 1,369 exposed). If Flagsmith's SRM check is strict (p < 0.01 or stricter), its warning stays quiet and our rule calls a broken experiment a Win (RULE 4 WIN).
- Detectability at 1,500 per arm: a chi-square test catches a 10% drop in about 79% of reruns at p < 0.05, 58% at p < 0.01 and only 31% at p < 0.001. A 20% drop is caught in about 99% even at p < 0.001 (`ASSUMPTIONS.md`). Flagsmith's own SRM threshold is not documented in the repo.
- What we did: the rule itself is unchanged (it is pre-registered). `pnpm expected-loss` now prints our own SRM p-value and a NOTE when p < 0.01 without a Flagsmith warning, and says to check the dashboard before trusting a Win. The SRM world will be run twice, labelled: the pre-registered `--drop 0.1`, then a `--drop 0.2` extra, and we report whatever Flagsmith does, including the case where it shows the gap. Both runs are pending.

## Results

Placeholder, to be filled after the analysis on 2026-11-29 at 11:00 IST, following `docs/analysis-runbook.md` and recorded in [DECISION.md](DECISION.md) ("Final result"). The rule is applied top to bottom and the first match wins.

| | explain_first (control) | fix_first |
|---|---|---|
| Exposed identities (Flagsmith) | TBD | TBD |
| `finding_fixed_clean` (Flagsmith) | TBD | TBD |
| Win probability, delta and 95% credible interval (Flagsmith) | baseline | TBD |
| `new_finding_after_edit` events (our reading, not Flagsmith's number) | TBD | TBD |

- Matched rule row and outcome: TBD
- Action taken in Flagsmith (experiment 725, flag `finding_style`): TBD
- Screenshot: `docs/results/2026-11-29-real-results.jpg` (to be added)

These are REAL visitors. Nothing above in "Simulated worlds" is a real result.
