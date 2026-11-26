# Lintmus decision log

Everything that happened to the `real` experiment after pre-registration (`EXPERIMENT.md`, commit 6b82376), in time order.
Deviations, false-positive rule fixes and the final verdict go here. Nothing in this file changes the pre-registered rule.

## Deviations

### 1. Late start (recorded 2026-11-27 00:57 IST)
- Planned start: 2026-11-26 16:00 IST. Actual start: 2026-11-27 00:57 IST (Flagsmith experiment id 725, environment `real`).
- Cause: Flagsmith Cloud keys and the Vercel deploy were not ready on time.
- Effect: the running window to the fixed analysis time (2026-11-29 11:00 IST, unchanged) is about 58 hours instead of 67.
  Expected exposed identities shrink accordingly; the decision rule and its thresholds are unchanged.
- Deployed code at start: commit b183960. Only `EXPERIMENT.md` and `README.md` changed since the pre-registration commit;
  no layout, exposure or metric code changed.

### 2. Guardrail is not attached in Flagsmith (recorded 2026-11-27 00:57 IST)
- The Flagsmith experiment wizard accepts one metric per experiment. Experiment 725 has `finding_fixed_clean` (expected direction
  increase) as its only metric; `new_finding_after_edit` cannot be attached in the UI.
- Effect on the rule: the "Flagsmith marks the guardrail losing" clause of rule 3 cannot fire from the dashboard. The guardrail is
  judged by the other clause (point estimate worse by more than 3 points absolute, at least 5 events per arm) from the raw
  `new_finding_after_edit` events, using `scripts/expected-loss.ts`. This reading is labelled "not Flagsmith's number".

## False-positive rule fixes
None.

## Verdict
Pending (analysis 2026-11-29 11:00 IST).
