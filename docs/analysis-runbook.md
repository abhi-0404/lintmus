# Analysis runbook: `real` experiment 725, Nov 29 2026, 11:00 IST

Goal: read the result once, apply the pre-registered rule in `EXPERIMENT.md` section 8 top to bottom (first match wins), write it into `DECISION.md`, then act in Flagsmith as the matched row says. The rule and thresholds do not change. All commands run from `D:\personal\hackathons\Flagsmith Hackathon\lintmus`. Do not edit anything under `src/`, `tests/`, `scripts/` or any config, and do not start a dev server.

Facts relied on: experiment 725 "Lintmus finding card: fix_first vs explain_first", environment `real`, started 2026-11-27 00:57 IST, 100% rollout, 50/50, primary `finding_fixed_clean` (increase). The guardrail `new_finding_after_edit` is NOT attached in Flagsmith (the wizard takes one metric; `DECISION.md` deviation 2). Items marked UNVERIFIED have not been observed in this project.

## 0. Before 11:00 (the evening before, or 10:30)
1. Code-unchanged check (feeds rule 1). Expected output: empty.
   ```
   git diff --stat b183960 HEAD -- src index.html vite.config.ts package.json experiment.config.json
   ```
   Also check in the Vercel dashboard that production is still commit b183960 or a docs-only later commit (UNVERIFIED how Vercel labels it). Any output, or a deployed code change, means pass `--code-changed` in step 2 and rule 1 (Void) applies.
2. Dry run of the reads on Nov 28 (private look at the `real` experiment page, no action; only SRM or guardrail harm may stop it early, per the hypothesis text). Settle two questions:
   - Can you find exposed and clean-fix counts per arm? (Dashboard table: Exposures and Occ. Rate. If it says "Collecting data", try hosted MCP `get_experiment_exposures` / `get_experiment_results` per the plan; UNVERIFIED for 725.)
   - Where do `new_finding_after_edit` counts per arm come from? UNVERIFIED. Candidates: Metrics page of `real`, hosted MCP, `flagsmith api` results JSON. If none gives a per-arm count, the guardrail is "unmeasured": use `--guard-control 0 --guard-variant 0` (under 5 events per arm counts as unmeasured, so a win is impossible and the best landing is row 5) and write "guardrail unmeasured" in DECISION.md.
3. Open: Flagsmith dashboard, environment `real` (not `sim`), Experiments, experiment 725. Terminal in the lintmus folder.

## 1. Read the dashboard (11:00)
1. Click Refresh once (rate limit about once per 5 minutes). Wait. Note the time.
2. Screenshot the whole page (top: title, status, banner, primary metric, rollout; then Results and Analysis). Save as `docs/results/2026-11-29-real-results.jpg` (plus `-banner.jpg` if separate). Never refresh again on camera.
3. Copy into a scratch table (labels as in the A/A screenshot):

   | Dashboard item | Goes to |
   |---|---|
   | Result shown or "Collecting data" (Results block / banner) | Rule 2 |
   | "Users enrolled" | DECISION.md only (enrolled is not exposed) |
   | Control "Exposures" / fix-first "Exposures" | `--control-n` / `--variant-n` |
   | Control and fix-first "Occ. rate" | derive `--control-conv`, `--variant-conv` |
   | "Win Probability" per arm | rules 3 and 4 |
   | "Delta" and "Credible interval (95%)" (relative %, not points) | DECISION.md, cross-check |
   | SRM warning, quarantine share (location UNVERIFIED, not seen in the A/A screenshot) | rule 1 |

4. Derive conversions: conv = round(Occ. rate / 100 x Exposures). Check: conv / Exposures must round back to the shown one-decimal rate. If two integers both do, use the MCP or API count. (A/A example: 33.3% of 1,521 gave 507, matching what was sent.)
5. Look for an SRM warning and any quarantine share on the page. Record yes / no / "not visible in the UI" exactly as seen. Expect none: in the `sim` worlds Flagsmith showed no SRM warning even at a 55/45 split on a 50/50 rollout (exp 1425, `docs/results/sim-worlds.md`), so the manual check in section 2 is what actually catches a broken split. A quarantine percentage goes to `--quarantine-pct` as a percent number (7 means 7%).
6. Guardrail counts per arm for `new_finding_after_edit` (identities with at least one event, exposed identities only) from the route chosen in step 0.2. Record the source; label it "our reading, not Flagsmith's number".

## 2. Run the rule
```
pnpm expected-loss -- --control-n <Exposures Control> --control-conv <derived> --variant-n <Exposures fix-first> --variant-conv <derived> --guard-control <count> --guard-variant <count> [optional flags] --seed 1
```
Required (the script exits with an error if missing): `--control-n --control-conv --variant-n --variant-conv --guard-control --guard-variant`.

Optional (from `scripts/expected-loss.ts`):
- `--srm-warning`: dashboard shows an SRM warning.
- `--quarantine-pct N`: dashboard shows N percent in quarantine (percent number; only matters above 5).
- `--code-changed`: step 0.1 showed layout, exposure or metric code changed after start.
- `--flagsmith-guardrail-losing`: Flagsmith marks the guardrail losing. It cannot (guardrail not attached); leave off.
- `--seed N`, `--draws N`: defaults seed 1, 100,000 draws; keep them.

Output, in order: both rates; chance to beat control; mean diff and 95% CrI in points; expected loss of shipping; guardrail rates, measured and losing; informational "own chi-square p" for the 50/50 split; `RULE n: OUTCOME` with reasons; `ACTION:`.

Own SRM p is informational. The rule voids only on Flagsmith's SRM warning. If the NOTE prints (p < 0.01, no `--srm-warning`), re-check the dashboard before trusting any Win and record the p and your finding in DECISION.md (the same gap as in the SRM sim world, `docs/results/sim-worlds.md`). Do not change the rule.

Manual SRM check (always, added 2026-11-27 after the `sim` SRM worlds; reporting only, the rule is unchanged):
1. Copy the CLI's "own chi-square p" into DECISION.md next to the verdict, every time, whatever the row.
2. If p < 0.01, write next to the verdict: "SRM suspected by our own check (p = <value>); Flagsmith showed no SRM warning, so the pre-registered rule did not void." Add the exposures per arm and the split in percent.
3. Do not pass `--srm-warning` unless Flagsmith itself shows a warning, and do not change the matched row. The flag is for readers, not a new rule.
4. If p < 0.01 and the row is 4 (Win), say in DECISION.md and the README that the Win comes with a suspected split break. Shipping fix-first still needs Abhishek's go-ahead (section 5 row 4).

Format example only (simulated A/A, NOT real):
```
pnpm expected-loss -- --control-n 1521 --control-conv 507 --variant-n 1479 --variant-conv 527 --guard-control 10 --guard-variant 12
```
Paste the full output into DECISION.md and save it to `docs/results/2026-11-29-real-expected-loss.txt`.

## 3. Map to rules 1-5 (first match wins; the CLI does the same, confirm its `RULE n` against the dashboard)
1. **Void:** SRM warning shown, or quarantine above 5% of exposed, or code changed after start.
2. **Below minimum:** Flagsmith primary still "Collecting data" (under 50 exposed or under 5 conversions in an arm); CLI line "has N exposed (floor 50)" / "conversions (floor 5)".
3. **Lose:** fix-first chance to beat control below 5% (dashboard Win Probability), or guardrail point estimate worse by more than 3 points (CLI guardrail diff).
4. **Win:** chance to beat above 95% AND 95% CrI excludes 0 AND expected loss below 0.5 points AND guardrail measured (5 or more events in each arm) and not losing.
5. **Inconclusive:** anything else, including a win-like primary with an unmeasured guardrail.

Interpretation to confirm with the owner (NOT in the pre-registration): the rule names Flagsmith's chance to beat control, while the CLI computes its own Beta-Binomial figure (uniform prior; Flagsmith's prior is undocumented here). Proposal: if the dashboard and CLI fall on different sides of 5% or 95%, take no action that ships or ends the experiment, treat it as row 5, and write both numbers and this choice in DECISION.md. Flagsmith's interval is relative percent, the CLI's is points: compare "excludes 0 or not", not magnitudes.

Expected landing (the plan's forecast, not a result): row 5 or row 2.

## 4. Write DECISION.md
1. Fill every blank in "Final result": readings, void checks, exact command, pasted output, rule walk (1 to 5), outcome row, action and time.
2. In "Verdict", replace "Pending (analysis 2026-11-29 11:00 IST)." with one sentence: row, outcome, action. Edit nothing else in the file.
3. Wording: inconclusive and below minimum are valid results ("the rule refused to ship on this evidence"), never failures. Put "our reading, not Flagsmith's number" next to every CLI figure. State that the in-textarea bias favours fix-first (EXPERIMENT.md section 9). `source = own_code` counts are exploratory raw counts only. Never describe a simulated number as real.

## 5. Complete the experiment in Flagsmith (per the matched row)
UI wording seen on the A/A page: an "End Experiment" button (top right) and rollout options such as "Roll out control" (used for the `sim` experiments). The dialog for rolling out `fix-first` has not been used in this project: UNVERIFIED. Act only after screenshots and CLI output are saved; screenshot the rollout choice and the flag state afterwards.
- **Row 1 Void:** End Experiment, roll out control (explain_first). This is the practical reading of "keep explain_first". Fix the bug and rerun after the hackathon if past Nov 28. Say the result is void and why.
- **Row 2 Below minimum:** do NOT end. Keep running. Report raw counts per arm and the CLI reading labelled "not Flagsmith's number".
- **Row 3 Lose:** End Experiment, `rollout_decision = control` ("Roll out control"). Deleting the fix-first layout code is a code change on the real app: only after submission and on Abhishek's go-ahead, in a new commit.
- **Row 4 Win:** End Experiment, roll out `fix-first` (variant). Keep the flag 7 days as a rollback switch, then remove the losing path (code change, after submission, on Abhishek's go-ahead). This changes the live site for every visitor and judge: re-verify on the live URL logged out.
- **Row 5 Inconclusive:** do NOT end. Keep explain_first as the default and keep running. Publish expected loss of shipping from the CLI.

Rows 2 and 5 leave the experiment running past submission; say in the README that the registered result is the Nov 29 11:00 snapshot.

## 6. After the decision
1. Fill beat 3 in `docs/demo-script.md` for the matched row; record and edit.
2. README: add the real result (separate from simulated), the matched row, EXPERIMENT.md commit and start times, screenshot paths. Unverified items stay marked.
3. `docs/HANDOFF.md`: what was read, the matched row, what was done in Flagsmith, what is left.
4. Commit and push only if Abhishek asks in that message (docs only, no `src/`).
5. Re-run `pnpm test` and `pnpm build` on the final commit and keep the output (plan definition of done, item 2).
