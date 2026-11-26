# Lintmus experiment pre-registration

DRAFT, local only. Not committed. Commit this file (and record the commit hash and time here) before the `real` experiment starts, then do not change it except to fill the two "recorded" lines below.

- Commit hash: (to be recorded at commit time)
- Commit time (IST): (to be recorded at commit time)
- `real` experiment start (IST): (to be recorded when started)

Flag: `finding_style` (multivariate). Control `explain_first`, variation key `fix-first` (value `fix_first`), 50/50. Machine-readable settings are in `experiment.config.json`.

## 1. Hypothesis (exact text)
> We believe that showing the corrected code first (`fix_first`) instead of the explanation first (`explain_first`) will increase the share of exposed visitors who make at least one clean fix (`finding_fixed_clean`), for visitors who see at least one Lintmus finding (mostly on the sample puzzle), because it removes the step of translating prose into code. We expect `fix_first` to win raw resolves almost mechanically; the real question is whether that survives once blind-paste errors are counted. Counter-mechanism: `fix_first` invites blind pasting (the fix pasted next to the old code instead of over it, or a placeholder metric name left in), which the guardrail `new_finding_after_edit` watches. We will ship `fix_first` only under the decision rule below. No early stopping except for guardrail harm or SRM.

## 2. Population and estimand
- Unit: anonymous identity (GUID in localStorage, created before the SDK init).
- Population: identities that see at least one finding card (exposed). Real traffic will be mostly `source = sample` (puzzle players, many not Flagsmith users). The estimand is the effect on that mixed population.
- `source = own_code` is described from raw counts only, labelled exploratory (Flagsmith results are not segment-aware).
- Excluded by design: visitors who never see a finding (never exposed), identities prefixed `test-`, sessions with `?internal=1` (never calls `trackExposureEvent`).
- Says nothing about the "all clear" state (code with zero findings never enters). Variant-independent, so no bias.

## 3. Variants (one change only)
Identical content, buttons and fix snippets; only order and default-expanded state differ.
- `explain_first` (control): title, "Why this breaks your experiment" expanded with docs link, corrected snippet collapsed behind "Show fix".
- `fix_first` (variation key `fix-first`): title, corrected snippet expanded with Copy button, explanation collapsed behind "Why?".
- Fix snippets use the user's metric names from the metric-names field, else the literal `YOUR_METRIC_NAME` (pasting it unchanged is detected by r03).

## 4. Exposure and assignment
- SDK initialised with the identity up front (identity-scoped flags loaded before anything renders). Layout gated on the identity-scoped value.
- Fixed 1.5 s timeout: if no server value, the user sees `explain_first` from the default handler, and NO exposure is ever tracked for that session.
- `trackExposureEvent` fires once per session in `FindingList` (the parent) when the first finding exists, before choosing the card component, inside a try/catch that a card render error cannot skip.
- The layout never switches after the first card has rendered.

## 5. Metrics (Flagsmith Occurrence, one per identity)
"Settled state" = a lint result after 4 s with no keystroke, or immediately after a paste or blur. Metrics are computed only on settled states.

| Metric | Role | Direction | Fires when |
|---|---|---|---|
| `finding_fixed_clean` | **Primary** | up (expected_direction increase) | On a settled state: a previously reported finding (still open since the last baseline) is gone, its **per-rule anchor** still exists (r01: an init call; r02: the flag read; r03: a `trackEvent` call whose literal name is in the metric list, or with no list is lower snake_case and not the placeholder; r04: the Python client construction; r05: at least one init/identify), the change from the previous settled state is under 60% of the text, AND the state contains no finding id never seen before in the session. |
| `new_finding_after_edit` | **Guardrail** | down (expected_direction not_increase) | On a settled state after the first edit: a finding id never seen before in the session appears. |
| `finding_resolved` | Informational | informational | Raw resolve (same as primary without the "no new finding" clause). Shows the expected mechanical win. |
| `fix_copied` | Informational (manipulation check) | informational | First Copy click on a fix. Confirms the variant was noticed; never a success metric. |

All metric logic lives in one pure module (`src/experiment/metrics.ts`) with unit tests, including a scripted keystroke sequence that proves half-typed states do not fire anything.

## 6. MDE, N and horizon
- MDE: +15% relative on `finding_fixed_clean` (smallest effect worth shipping). Binds through sim sizing, the power check, and the expected-loss threshold (the ship rule adds: expected loss of shipping < 0.5 points, about one tenth of the MDE in absolute terms). We deliberately do not require posterior mean >= MDE: a smaller real gain from a zero-cost layout is still worth shipping.
- Real: fixed horizon, Nov 26 16:00 IST start to **Nov 29 11:00 IST** analysis. No fixed N. Expected 45-175 exposed identities. Stated up front: at 50 per arm only a lift above roughly +75% relative is usually decisive; a decisive real result is possible but not expected (under 25%).
- Sim: 1,500 identities per arm (3,000) per world. At baseline 35% and +18% relative, P(beat) > 95% in about 97% of reruns (verified by hand; `scripts/power.ts` re-checks with 1,000 offline reruns and also reports power at +15%).
- Flagsmith floor: 50 identities and 5 conversions per arm per metric before numbers show; SRM check after 100 identities.

## 7. Simulated worlds (never decide anything about humans)
Real `@flagsmith/nodejs` SDK, identity prefix per world, seed printed in the first log line, `close()` at the end, throttle ~10 identities/s. Behavioural model: latent experience, patience, bug count; the variant changes mechanisms only (P(sees fix), P(understands), blind-paste risk). Baselines from the Nov 28 08:00 pilot snapshot where n >= 30, else "assumed" in `ASSUMPTIONS.md`.

| World | Setup | Must show |
|---|---|---|
| A/A | Variant ignored by the model | No winner, SRM quiet |
| MDE | Mechanisms tuned so expected clean-fix lift = +18% relative ("assumed: just above the smallest effect worth shipping") | Decisive win under the rule |
| Harm | Fix-first raises raw resolves, blind paste doubles | Guardrail losing, rule refuses to ship |
| SRM | MDE world with 10% of `fix_first` exposures dropped (the crashing-card bug) | Flagsmith SRM warning fires, rule voids |

Wording everywhere: "The simulation validates the design and the decision rule; it says nothing about developers."

## 8. Decision rule (applied to `real`, evaluated top to bottom, first match wins)

| # | Outcome | Condition | Action through `finding_style` |
|---|---|---|---|
| 1 | **Void** | Flagsmith SRM warning, or quarantine > 5% of exposed, or any change to layouts, exposure or metric code after start | Results void. Keep `explain_first`. Fix the bug, start a new experiment (after the hackathon if past Nov 28). |
| 2 | **Below minimum** | Primary still "Collecting data" at the horizon (under 50 exposed or 5 conversions per arm) | Inconclusive, did not ship. Report raw exposures and conversions per arm (MCP `get_experiment_exposures` / results) and our Beta-Binomial reading labelled "not Flagsmith's number". Keep running after the hackathon. |
| 3 | **Lose** | Primary chance to beat control < 5%, OR guardrail losing (Flagsmith marks it losing, or point estimate worse by > 3 points absolute) | Complete experiment with `rollout_decision = control`. Delete the fix-first layout code. |
| 4 | **Win** | Primary chance to beat > 95% AND 95% credible interval excludes 0 (together about 97.5% one-sided, stated in README), AND expected loss of shipping < 0.5 points, AND guardrail measured (>= 5 events per arm) and not losing | Complete experiment with `rollout_decision = variant` (`fix-first`). Keep the flag 7 days as a rollback switch, then remove the losing code path. |
| 5 | **Inconclusive** | Anything else, including a win-like primary with an unmeasured guardrail | Do not ship. Keep `explain_first`, keep running toward the sim-sized N, publish expected loss of shipping now. |

## 9. Honesty note
At real N the guardrail interval is about plus or minus 7 points, so on real traffic the guardrail can block a ship but cannot certify safety; the clean-fix primary carries the safety burden, and the harm world proves the guardrail blocks when harm is large. In-textarea fixing understates real fixing (people fix in their IDE), more so in `explain_first`; this biases toward `fix_first` and is stated first, by us. Lint rules are frozen at start; false-positive fixes are allowed, apply equally to both arms, and are logged in `DECISION.md`. Any change to layouts, exposure or metric code after start voids the result.
