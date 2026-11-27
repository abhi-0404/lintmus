# HANDOFF: Lintmus (Track 1), Phase 1 + simulator/stats (Phase 3-4 build) (builder, 2026-11-26)

Authoritative plan: `..\Test Something Real\04-final-plan.md`. Nothing here is committed or pushed (no git repo yet).

## What exists
- Vite 7 + React 19 + TypeScript app, plain CSS. The whole app works with NO Flagsmith key: it falls back to the control layout and tracks nothing (the footer says "Tracking is off in this build").
- Lint engine (done, tested, frozen at experiment start): `src/lint/`, rules r01-r05, puzzle in `src/lint/samples.ts` (3 planted bugs, r01 r02 r03).
- `src/experiment/`
  - `identity.ts`: GUID in localStorage, `test-` and `?internal=1` helpers.
  - `flagsmith.ts`: the only file that touches `@flagsmith/flagsmith`. Init with identity, `enableEvents: true`, `cacheFlags: false`, default handler (`finding_style` = `explain_first`), own 1.5 s timeout (`flagTimeoutMs`), `fromServer` = `loadingState.source === 'SERVER'` only. Reads the flag with `getAllFlags()` (never `getExperimentFlag`). Timeout or failure freezes the session on `explain_first` with no exposure ever. Flush: `flushEvents()` on `visibilitychange` hidden; `close(1000)` on `pagehide` (`flushEvents()` if the page is bfcached). `sendMetric()` sends `trackEvent` only when fromServer, SDK live, not `?internal=1`, not opted out. `REQUIRE_IN_EXPERIMENT = true` also requires `flag.experiment.inExperiment` for the exposure.
  - `exposure.ts`: pure gate `shouldTrackExposure` (fromServer AND inExperiment AND not test-/internal AND not opted out) and a once-per-session latch. The SDK call is wired in `flagsmith.ts`; `FindingList` calls `exposure.trackOnce()` in its render body, before choosing the card component, inside try/catch.
  - `settle.ts`: 4 s idle / paste / blur detector (fake-timer tested). `metrics.ts`: pure settled-state logic (finding_fixed_clean, new_finding_after_edit, finding_resolved, fix_copied, one per identity, per-rule anchors, 60% change rule).
- `src/ui/`: PuzzleIntro, CodeInput, MetricNamesInput, FindingList (with a per-card error boundary), FindingCardExplainFirst, FindingCardFixFirst, ShareLine (only after the puzzle is solved), ConsentBanner (notice, "Got it", "Do not track me"), SimDemoBanner (when `VITE_LINTMUS_ENV=sim`), `cardParts.tsx` (shared pieces so the arms show identical content; only order and default-expanded state differ).
- Tests (Vitest, pure code): rules, levenshtein, prng, `settle.test.ts`, `exposure.test.ts`, `metrics.test.ts` (includes a keystroke script proving half-typed states fire nothing). 52 tests at the end of Phase 1; 104 now with the sim and stats tests.

## How to run
```
pnpm install
pnpm test          # vitest run (104 tests)
pnpm build         # tsc -b && vite build
pnpm dev           # only when asked; stop it afterwards
```
Env (`.env`, see `.env.example`): `VITE_FLAGSMITH_ENVIRONMENT_KEY` (client-side key; empty = tracking off), `VITE_LINTMUS_ENV=sim` for the sim-demo deployment, optional self-hosted URLs. `pnpm ping` / `pnpm smoke` as in Phase 0 (Node keys).

## Decisions and deviations to review
1. Exposure also requires `inExperiment` (per `docs/sdk-facts.md`). Consequence: before the `real` experiment is started, NO exposure is sent, so a pre-start "test exposure arrives" check is not possible; set `REQUIRE_IN_EXPERIMENT = false` temporarily on a non-real build to test the pipe, then set it back before launch.
2. `test-` identities send NO exposure (plan: excluded by design) but DO send metric events (they cannot join an experiment without an exposure). To use one: set localStorage `lintmus_identity` to `test-abc` in the browser. `?internal=1` sends nothing at all.
3. Metrics are sent only when `fromServer` (a default-handler or timed-out session sends no metrics either), to avoid conversions without exposures.
4. A settled state that changes 60% or more of the text, the first settled state, a puzzle reset and any edit of the metric-names field are baselines: they fire nothing (this also keeps a freshly pasted own-code file from tripping the guardrail). "Change" is the smaller of a prefix/suffix measure and a changed-lines measure, so multi-place edits are not over-counted.
5. r02 anchor (the flag read) additionally requires the file to still use events, because r02 only fires for event-using files; otherwise deleting all event code would look like a fix.
6. Metrics fire once per page session (not persisted across sessions); Flagsmith Occurrence metrics count once per identity anyway.
7. Consent banner is a notice with an opt-out (opt-out stops exposure and metrics); it does not gate init.
8. Findings display waits for the experiment state (at most 1.5 s, instant with no key) so the layout never flickers.

## Reviewer fixes (Phase 1 review)
- Metrics: a finding that disappears WITHOUT its anchor (half-typed or emptied name, half-typed method name, deleted call) now stays "open", so the later real fix still counts; before, a settled half-typed state (4 s pause, or a blur such as clicking "Show fix") either credited a fix (empty event name) or swallowed it (r02 `getExp`), which is arm-dependent (control users retype, fix-first users paste).
- r03 anchor tightened: the `trackEvent` call must carry an accepted name (in the metric list; with no list, lower snake_case and not `YOUR_METRIC_NAME`). EXPERIMENT.md row updated.
- r03 finding ids are keyed on the fix target (`r03:mismatch:<metric>`, `r03:placeholder`, `r03:style:<suggestion>`), so a rename in progress is the same finding, not a "new" one tripping the guardrail.
- "Use my own code" now takes a fresh metrics baseline.

## Simulator, stats and decision rule (built offline, nothing run against Flagsmith yet)
Nothing under `src/` was touched. New: `scripts/sim/model.ts` (behavioural model, 4 worlds), `scripts/sim/prng.ts` (added `userSeed`/`userRng`), `scripts/stats/beta.ts` (Marsaglia-Tsang gamma, Beta, Beta-Binomial compare, SRM chi-square), `scripts/expected-loss.ts` (decision rule 3.8, CLI), `scripts/power.ts` (1,000 offline reruns), `scripts/simulate.ts`, `ASSUMPTIONS.md`, tests `sim-model`, `stats`, `expected-loss` (plus `userRng` cases in `prng.test.ts`), `docs/power-run.txt` (the saved full `power.ts` output). package.json: three script entries only (`simulate`, `power`, `expected-loss`), no dependency.

```
pnpm power                                   # 1,000 reruns, offline, ~15 s. Options: --reruns --n --seed --draws --srm-alpha --drop
pnpm simulate -- --world mde --seed 42 --n 3000 --dry-run     # offline: arm counts, conversion summary, model expectation
pnpm simulate -- --world mde --seed 42 --n 3000 --env sim     # live: needs FLAGSMITH_ENV_KEY_SIM in .env (server-side key)
pnpm expected-loss -- --control-n 1500 --control-conv 525 --variant-n 1500 --variant-conv 620 --guard-control 13 --guard-variant 25
```
Live runs: `--env sim-aa` reads `FLAGSMITH_ENV_KEY_SIM_AA`; `--env real` is refused; create and START the experiment for that world first (identities not enrolled get no exposure; the script counts and warns). Identities are `sim-<world>-s<seed>-<5 digits>`. The arm always comes from Flagsmith; the model only decides behaviour. Exposure is sent the way `getExperimentFlag` would (flag variant as value, `experiment_id` metadata) via `trackExposureEvent`, then the 4 metric events via `trackEvent` with the names from `experiment.config.json`, then `flushEvents()` and `close(30000)`. The live path was exercised against a local mock Flagsmith server (400 identities: 400 exposures and metric counts equal the printed summary) and against an unreachable server (default handler, nothing sent, clean exit). It has not seen real Flagsmith.

Results of `pnpm power` (seed 2026, saved in `docs/power-run.txt`): at 35% baseline, 1,500 per arm, P(beat) > 95% in 90.9% of reruns at +15% and 96.5% at +18% (plan: about 97%); the stricter full win clause (P>95% and CrI excludes 0 and expected loss < 0.5 pts) 84.0% and 94.2%. A/A: 5.1% P(beat) > 95%, 3.3% full win clause. Model worlds through the full rule: aa mostly inconclusive (2.4% win, 4.2% lose, 0.8% void); mde wins 91.7%; harm loses 99.0% (guardrail +5.7 points); srm void 58.5% at SRM alpha 0.01.

## Findings and deviations (simulator phase)
1. SRM world detectability: a 10% drop at 1,500 per arm gives chi-square p about 0.005. Flagged in 79% / 58% / 31% of reruns at p<0.05 / 0.01 / 0.001. If Flagsmith's SRM warning is strict, the plan's 10% may not trigger it at n = 3,000. Use `--drop 0.2` (detected about 99% even at p<0.001) or more identities if the first live SRM run shows no warning. Decide after seeing Flagsmith's behaviour.
2. The harm world's primary also rises (+22%) while the guardrail is +5.7 points worse: the rule refuses via rule 3 (guardrail), which is the intended demonstration.
3. Mechanism values are ASSUMED and tuned to the pre-registered targets (35% baseline, +18% in the MDE world). All of it is in `ASSUMPTIONS.md`; nothing is measured because there is no pilot yet. Replace rows from the Nov 28 pilot where n >= 30.
4. Decision-rule interpretations in `expected-loss.ts`: the guardrail needs at least 5 events in EACH arm to count as measured; "95% CrI excludes 0" uses the credible interval of variant minus control (so the win needs P(beat) of about 97.5%); "guardrail losing" is the optional `--flagsmith-guardrail-losing` flag or a point estimate more than 3 points worse; quarantine and code-change inputs are flags (`--quarantine-pct`, `--code-changed`, `--srm-warning`). Beta(1,1) prior, so our numbers can differ slightly from Flagsmith's.
5. The simulator exposes with `trackExposureEvent` after `getIdentityFlags` (not `getExperimentFlag`) so the SRM world can drop exposures; it mirrors `getExperimentFlag` exactly otherwise. It does not require `variant` (the control's variant string is still unverified, see sdk-facts.md item 7), matching the app, which also sends an exposure with an undefined value for control.
6. Dropped-exposure identities (SRM world) still send their metric events live; the offline summary and the rule count only exposed identities, as Flagsmith would.

## Not done yet / open
- Nothing has been run against Flagsmith (no keys yet): the control variant's `variant` string, `inExperiment` behaviour and the unload flush are untested. Check the unload flush by closing the tab right after a conversion.
- Not built: README, DECISION.md. (Simulator, stats, power, expected-loss, ASSUMPTIONS and their tests are built, see below.)
- Not visually checked in a browser (no dev server was run); build and SSR render of both layouts pass.
- Phase 0 open items still apply: Python SDK names for r02 and r04 unverified; rule docs links point to the experimentation docs root; rules freeze at experiment start.

## Dependencies
No new dependency added in Phase 1. Installed set as in Phase 0 (react 19.2.4, @flagsmith/flagsmith 12.6.0, vite 7.3.8, vitest 4.1.12, typescript 7.0.2, @flagsmith/nodejs 9.5.0 dev, etc.).

## Nov 26, late evening
- Flagsmith keys expected Nov 27 after 15:00 IST, so the `real` start moves to about Nov 27 17:00-18:00 IST (planned Nov 26 16:00).
  Record the actual start time in EXPERIMENT.md line 7 and the late start as a deviation in DECISION.md when it starts.
- `docs/launch-posts.md`: wave 1 (Discord, LinkedIn, X, IITM groups) and wave 2 drafts, with rules that keep the experiment clean
  (never name the arms, no internal links, no public peeking). Replace `<URL>` after the Vercel deploy.

## Nov 27: Flagsmith Cloud wired (browser session)
- Cloud project `lintmus` (id 56550) already had environments `real` and `sim` (plus the default Production and lintmus); both show the managed
  Flagsmith warehouse as connected. No `sim-aa` / `sim-mde` / `sim-harm` / `sim-srm` environments: run the worlds sequentially in `sim`.
- Created metrics in BOTH `real` and `sim` (metrics are per environment in the dashboard), all Occurrence, event name = metric name:
  `finding_fixed_clean` (higher is better), `new_finding_after_edit` (lower is better), `finding_resolved` and `fix_copied` (informational).
- Created feature `finding_style` (all environments): enabled, control value `explain_first`, one variant with key `fix-first` and value
  `fix_first`, default weight 0. Verified through the edge SDK API: both envs serve `finding_style enabled=true value=explain_first`.
- `.env` created from `.env.example` (git-ignored) with the CLIENT-side keys: `VITE_FLAGSMITH_ENVIRONMENT_KEY` and `FLAGSMITH_ENV_KEY_REAL` = real,
  `FLAGSMITH_ENV_KEY_SIM` = sim. No server-side keys were created. `pnpm run ping` (not `pnpm ping`, which is pnpm's own registry ping):
  real and sim accepted `prework_ping` for identity `prework-test`.
- NO experiment was created or started in any environment.
- Next: smoke experiment in `sim` (plan step 10, confirms the control `variant` string), Vercel deploy (`lintmus` with the real key,
  `lintmus-sim-demo` with the sim key and `VITE_LINTMUS_ENV=sim`), then start the `real` experiment and record the time in EXPERIMENT.md line 7.

## Nov 27 (later): smoke done, Vercel waiting on identity check, `real` NOT started
- `sim` smoke experiment "SIM smoke: finding_style pipeline check" (id 721, 100% rollout, 50/50, primary `finding_fixed_clean` increase).
  `pnpm run smoke`: 120 of 120 enrolled. Flagsmith matched the script exactly: control 58 exposures 31.0% (18), fix-first 62 exposures 22.6% (14).
  Screenshot `docs/results/2026-11-27-sim-smoke-results.jpg`. Completed with "Roll out control", so `sim` serves `explain_first` again.
- Findings: control `variant` = `"control"` (sdk-facts item 7 closed, app needs no change); wizard allows only one metric per experiment
  (no guardrail in Flagsmith results, see sdk-facts.md). The below-floor `fix_copied` display could not be observed for that reason.
- Vercel: project `lintmus` from abhi-0404/lintmus (Vite preset, root ./, env `VITE_FLAGSMITH_ENVIRONMENT_KEY` = real client key) was submitted,
  but Vercel asked for an identity verification code; the deploy has NOT run. Owner must enter the code in the open tab.
- `real` experiment deliberately NOT started: start it only after the live site loads and `finding_style` resolves from the server.
  Then record the start time in EXPERIMENT.md line 7. Second Vercel project `lintmus-sim-demo` (sim key + `VITE_LINTMUS_ENV=sim`) still to do.

## Nov 27, 00:57 IST: `real` experiment STARTED
- Live: https://lintmus.vercel.app (Vercel project `lintmus`, commit b183960, bundle has the `real` client key only; loads identity flags
  from edge.api.flagsmith.com with 200). Sim demo: https://lintmus-sim-demo.vercel.app (project `lintmus-sim-demo`, env
  `VITE_FLAGSMITH_ENVIRONMENT_KEY` = sim key and `VITE_LINTMUS_ENV=sim`, shows the SIMULATION DEMO banner, `real` key absent).
- Flagsmith `real` experiment id 725 "Lintmus finding card: fix_first vs explain_first": exact hypothesis from EXPERIMENT.md, 100% rollout,
  50/50, primary `finding_fixed_clean` increase. Started 2026-11-27 00:57 IST. Probe identities `test-start-check-1..3` (no events sent)
  are enrolled in both arms. EXPERIMENT.md line 7 filled in; DECISION.md created with deviations 1 (late start) and 2 (no guardrail in Flagsmith).
- `docs/launch-posts.md`: `<URL>` replaced with https://lintmus.vercel.app. Posting is the owner's job.
- From now on: do NOT change layouts, exposure or metric code (voids the result). Sim worlds go in `sim` with new experiments.
- Uncommitted: EXPERIMENT.md (start line), DECISION.md, docs/HANDOFF.md, docs/sdk-facts.md, docs/launch-posts.md, docs/results/. Commit and push
  when the owner asks (only docs, so the experiment stays valid).
- Next: check exposures arrive in `real` after the first visitors (Refresh in the dashboard, max once per 5 min); run the 4 sim worlds
  (`pnpm simulate -- --world <aa|mde|harm|srm> --env sim`, each with its own experiment in `sim`); analysis 2026-11-29 11:00 IST.

## Nov 27: sim worlds, A/A done
- A/A world ran live in `sim` (seed 42, 3,000 identities, 0 errors, 0 not enrolled). explain_first 507/1521 (33.3%), fix_first 527/1479
  (35.6%); guardrail 10 vs 12. Own rule: INCONCLUSIVE (P(beat) 90.8%, 95% CrI [-1.10, 5.70] pts, expected loss 0.075 pts), the
  correct A/A outcome. Saved in `docs/results/2026-11-27-sim-aa.txt`. Flagsmith's own dashboard reading of the A/A experiment is
  still to be recorded there.
- MDE dry run OK (model: 34.9% -> 41.3%, +18% relative).
- Blocked: the browser session was not connected, so the A/A experiment is not yet completed in Flagsmith and the MDE experiment is
  not yet created. Next: record Flagsmith's A/A reading, complete that experiment, create and START "SIM MDE" in `sim` (same flag,
  100% rollout, 50/50, primary `finding_fixed_clean` increase), then
  `pnpm simulate -- --world mde --seed 42 --n 3000 --env sim` (about 15 minutes). Then harm, then srm.

## Nov 27, 01:40 IST: MDE aborted, browser not connected, offline prep done
- A/A done and recorded in `docs/results/sim-worlds.md` (experiment 740; Flagsmith shows a 90% "winner" banner, our rule says INCONCLUSIVE).
- MDE seed 42: first read as aborted at 1,500/3,000, but it was still running and FINISHED 3,000/3,000 (our rule: WIN). The
  seed 43 rerun the owner chose on the wrong basis is not needed (owner to confirm). Details in sim-worlds.md.
- The browser session was NOT connected, so nothing changed in Flagsmith. The MDE experiment is still RUNNING in `sim` (data complete).
- Offline: dry runs for MDE s43, harm, SRM and their expected verdicts are in sim-worlds.md. Found that the SRM world (10% drop,
  p = 0.033) wins under our rule unless Flagsmith itself warns. `scripts/expected-loss.ts` now prints our own SRM p and a NOTE
  (informational, rule unchanged; scripts only, so the `real` experiment stays valid). 104 tests pass, build and typecheck clean.
- Live sites both return 200 (https://lintmus.vercel.app, https://lintmus-sim-demo.vercel.app).
- Next (needs the browser): read and screenshot the MDE seed 42 experiment, record Flagsmith vs our rule, complete it with
  "Roll out control"; then harm, then SRM (owner chose both: pre-registered `--drop 0.1`, then a labelled `--drop 0.2` extra, each its own experiment). Analysis of `real` 2026-11-29 11:00 IST.

## Nov 27 (night): submission prep docs
Docs only; nothing under `src/`, `tests/`, `scripts/` or config was touched, so the `real` experiment is unaffected. Nothing committed or pushed.
- New: `docs/demo-script.md` (shot list within the 2:30 plan cap, beat 3 variants per rule row, inconclusive fallback, asset status).
- New: `docs/submission-checklist.md` (official rules plus plan items, each Done / To do / Owner, checked against the files on disk).
- Changed: `DECISION.md` gained an empty "Final result" template section (nothing removed).
- New: `docs/analysis-runbook.md` (Nov 29 11:00 steps for experiment 725, `pnpm expected-loss` flags, rule mapping, Flagsmith actions).
- Open items surfaced: README lacks a "How Flagsmith is used" section, the live URL and the video link; harm and SRM worlds not run live; MDE Flagsmith reading and screenshot missing; guardrail counts source UNVERIFIED (not attached in Flagsmith); two doc files mention a browser tool by name (reword before the final push).

- Nov 27 (night): docs/README-draft-sections.md drafted for the owner to merge

## Nov 27 (morning): status check
- Browser session still not available, so nothing changed in Flagsmith. MDE experiment (seed 42) is still RUNNING in `sim` with complete data.
- Checked all docs (tracked and untracked): none names an AI assistant or browser tool. Checklist row updated.
- Still needs the browser, in order: read and screenshot the MDE experiment, complete it with "Roll out control"; create, run and record
  harm (`--world harm`); then SRM `--drop 0.1` and the labelled `--drop 0.2` extra, each in its own experiment.
- Still needs the owner: merge `docs/README-draft-sections.md` into README (Flagsmith usage, live URL, video link); confirm no seed 43 MDE rerun;
  approve committing the docs. Analysis of `real` 2026-11-29 11:00 IST (`docs/analysis-runbook.md`).

## Nov 27 (afternoon): sim worlds run live
- MDE (exp 747): Flagsmith > 99% winner, +19.2%; our rule WIN. PASS. Completed, control rolled out.
- Harm (exp 1415): Flagsmith "> 99% winner, roll out fix-first" (+26.3%); our rule LOSE (guardrail +5.89 pts). PASS. Key demo point:
  Flagsmith judges only the primary, the pre-registered guardrail clause refuses. Completed, control rolled out.
- SRM drop 0.1 (exp 1416): Flagsmith no SRM warning, > 99% winner; our rule WIN (own p = 0.021). FAIL, reported as is; rule
  unchanged for `real`. Completed, control rolled out.
- SRM EXTRA drop 0.2 (exp 1425, not pre-registered): Flagsmith shows NO SRM warning even at 55/45 (1,490 vs 1,200),
  "> 99% winner" +26.4%; our rule WIN with its own SRM NOTE (p = 2.3e-8). FAIL. Conclusion: Flagsmith has no visible SRM check,
  so the `real` analysis now has a manual SRM check (`docs/analysis-runbook.md` section 2): report the script's own SRM p
  next to the verdict and flag p < 0.01 by hand (rule itself unchanged). Completed,
  control rolled out. All four sim experiments are now completed; nothing is running in `sim`.
- Nothing committed. `real` experiment untouched (sim only, docs only).
