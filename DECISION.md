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

## Final result
Template, filled on 2026-11-29 from 11:00 IST following `docs/analysis-runbook.md`. Leave a blank as "not available" with the reason, never delete a line. Nothing here changes the pre-registered rule. The simulated worlds are in `docs/results/sim-worlds.md` and are never mixed into this section.

### Reading
- Analysis time (IST): ___ ; Flagsmith Refresh clicked at (IST): ___
- Screenshots: `docs/results/2026-11-29-real-results.jpg` ___ ; other: ___
- Flagsmith shows a result or "Collecting data": ___

| | explain_first (Control) | fix_first (fix-first) |
|---|---|---|
| Exposures (Flagsmith table) | ___ | ___ |
| `finding_fixed_clean` occ. rate (Flagsmith) | ___ % | ___ % |
| `finding_fixed_clean` conversions (derived: rate x exposures, rounded) | ___ | ___ |
| Win probability (Flagsmith) | ___ % | ___ % |
| Delta and 95% credible interval (Flagsmith, relative) | baseline | ___ , [___ , ___] |
| `new_finding_after_edit` events (source: ___; our reading, not Flagsmith's number) | ___ | ___ |

- Users enrolled (Flagsmith, informational): ___
- Informational metrics (`finding_resolved`, `fix_copied`) per arm, if read: ___
- `source = own_code` raw counts (exploratory only): ___

### Void checks (rule 1)
- Flagsmith SRM warning: yes / no / not visible in the UI (circle one; say where looked): ___
- Quarantine share of exposed: ___ % (or not shown)
- Code changed after start: no / yes. Evidence: output of `git diff --stat b183960 HEAD -- src index.html vite.config.ts package.json experiment.config.json` = ___ ; deployed commit = ___
- Own chi-square SRM p from the script (informational): ___

### Command and output
```
pnpm expected-loss -- --control-n ___ --control-conv ___ --variant-n ___ --variant-conv ___ --guard-control ___ --guard-variant ___ [flags: ___] --seed ___
```
Output (paste in full; this is our own Beta-Binomial reading, NOT Flagsmith's number):
```
___
```
Saved copy: `docs/results/2026-11-29-real-expected-loss.txt` ___

### Rule walk (top to bottom, first match wins)
1. Void: matched / not matched, because ___
2. Below minimum: matched / not matched, because ___
3. Lose: matched / not matched, because ___
4. Win: matched / not matched, which condition failed: ___
5. Inconclusive: matched / not matched, reasons: ___

### Outcome and action
- Matched row: ___ (outcome: ___)
- Flagsmith and the script disagree across 5% or 95%: no / yes (numbers and the treatment chosen: ___)
- Action taken in Flagsmith (what, time IST, screenshot): ___
- State of `finding_style` and experiment 725 afterwards: ___
- Next step for the flag and for the code (if any, after submission): ___

### What we claim, and what we do not
- Claim, in one sentence: ___
- Not claimed: no simulated number is a real result; the simulation validates the design and the decision rule and says nothing about developers.
- Limits restated: expected traffic was small (the plan expected 45-175 exposed identities) and the window was about 58 hours after the late start (deviation 1); the guardrail was not attached in Flagsmith (deviation 2), so it can block a ship on our own counts but cannot certify safety; fixing code in a text box understates real IDE fixing, more so in explain_first, which biases toward fix_first (EXPERIMENT.md section 9).
- Rule-fix log at analysis time: ___ (none, or each fix with timestamp)
