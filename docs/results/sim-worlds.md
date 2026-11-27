# Simulated worlds on Flagsmith Cloud (`sim` environment)

The simulation validates the design and the decision rule; it says nothing about developers.

Each world: its own experiment in `sim` on `finding_style` (100% rollout, 50/50, primary `finding_fixed_clean`, increase),
3,000 identities through the real `@flagsmith/nodejs` SDK (`pnpm simulate -- --world <w> --seed 42 --n 3000 --env sim`),
then Flagsmith's result next to our own rule (`pnpm expected-loss`, Beta-Binomial, NOT Flagsmith's number), then completed with
"Roll out control" so `sim` returns to `explain_first`. Run on 2026-11-27 (IST). Logs and screenshots in this folder.

Lock scope (plan step 10): a `sim` experiment on `finding_style` started fine while the `real` experiment 725 was running on the same
flag, so the one-running-experiment lock is per environment.

## A/A (experiment 740)
- Sent: explain_first 1,521 exposed, 507 clean fixes (33.3%); fix_first 1,479 exposed, 527 (35.6%). Guardrail 10 vs 12 (0.66% vs 0.81%).
- Flagsmith: identical counts; fix-first +6.9%, 95% CrI [-3.7%, 17.5%], 90% chance to be best; banner "90% Winner Probability Confirmed.
  Consider rolling out fix-first to all users." No SRM warning.
- Our rule: RULE 5 INCONCLUSIVE (chance to beat 90.8% is not above 95%, interval includes 0). Expected loss of shipping 0.075 points.
- Must show: no winner, SRM quiet. Result: PASS under our rule. Note: the dashboard's default banner recommends shipping at 90% on a
  world with no true difference; the pre-registered 95% plus interval clause is what refuses it.
- Files: `2026-11-27-sim-aa.log`, `2026-11-27-sim-aa-banner.jpg`, `2026-11-27-sim-aa-results.jpg`.

## MDE (experiment 747, seed 42): COMPLETE, 3,000 of 3,000
- Sent: explain_first 1,486 exposed, 509 clean fixes (34.3%); fix_first 1,514 exposed, 618 (40.8%). Guardrail 13 vs 27
  (0.9% vs 1.8%). Lift +19.2%. 0 errors, 0 not enrolled, `close()` flushed. Log: `2026-11-27-sim-mde-s42.log`.
- Our rule: RULE 4 WIN (chance to beat 99.99%, 95% CrI [3.11, 10.01] pts, expected loss 0.000, guardrail measured and not
  losing; own SRM p = 0.609).
- Flagsmith (experiment 747, read 2026-11-27, data as of 12:24 UTC): identical counts (1,486 at 34.3%, 1,514 at 40.8%);
  fix-first +19.2%, 95% CrI [8.1%, 30.3%], > 99% chance to be best; banner "> 99% Winner Probability Confirmed". No SRM warning.
  Completed with "Roll out control", so `sim` serves `explain_first` again.
- Files: `2026-11-27-sim-mde-s42.log`, `2026-11-27-sim-mde-banner.jpg`, `2026-11-27-sim-mde-results.jpg`.
- Must show: a win. Result: PASS. Flagsmith and our rule agree.
- Note on a mistaken abort (2026-11-27 01:35 IST): the log was read at 1,500/3,000 while the run was still going and
  took it for an abort; on that wrong basis the owner picked a seed 43 rerun. The run completed, so the seed 42 data is complete and
  a seed 43 rerun is not needed (owner to confirm). The seed 43 dry-run row below is kept only as a cross-check.

## Harm (experiment 1415, seed 42): COMPLETE, 3,000 of 3,000
- Sent: explain_first 1,550 exposed, 535 clean fixes (34.5%); fix_first 1,450 exposed, 632 (43.6%). Guardrail 6 vs 91
  (0.4% vs 6.3%). Lift +26.3%. 0 errors, 0 not enrolled. Log: `2026-11-27-sim-harm.log`.
- Our rule: RULE 3 LOSE (guardrail worse by 5.89 points, limit 3), even though the primary has a 100% chance to beat control,
  95% CrI [5.58, 12.53] pts. Own SRM p = 0.068 (quiet). Output: `2026-11-27-sim-harm.txt`.
- Flagsmith (read 2026-11-27, data as of 12:40 UTC): identical counts; fix-first +26.3%, 95% CrI [14.9%, 37.7%], > 99% chance to
  be best; banner "> 99% Winner Probability Confirmed. Consider rolling out fix-first to all users." No SRM warning.
  Completed with "Roll out control".
- Must show: lose despite a better primary. Result: PASS under our rule. Key finding: Flagsmith's experiment judges only the primary
  metric (no guardrail attached, deviation 2), so its banner recommends shipping a variant that makes blind-paste errors 16 times
  more common. The pre-registered guardrail clause is what refuses it.
- Files: `2026-11-27-sim-harm.log`, `2026-11-27-sim-harm.txt`, `2026-11-27-sim-harm-banner.jpg`, `2026-11-27-sim-harm-results.jpg`.

## SRM, pre-registered drop 0.1 (experiment 1416, seed 42): COMPLETE, 3,000 identities
- Sent: explain_first 1,487 exposed, 493 clean fixes (33.2%); fix_first 1,513 assigned but only 1,364 exposed (149 exposure
  events dropped), 566 (41.5%). Guardrail 7 vs 28 (0.5% vs 2.1%). 0 errors. Log: `2026-11-27-sim-srm-d10.log`.
- Our rule (no `--srm-warning`, since Flagsmith gave none): RULE 4 WIN (chance to beat 100%, 95% CrI [4.79, 11.87] pts,
  guardrail +1.58 pts, under the 3-point limit). Own SRM chi-square p = 0.021, informational only, above the 0.01 NOTE level.
  Output: `2026-11-27-sim-srm-d10.txt`.
- Flagsmith (read 2026-11-27, data as of 12:55 UTC): 2,851 enrolled, split shown as 52% / 48%; fix-first +25.2%, 95% CrI
  [13.2%, 37.2%], > 99% chance to be best; banner "> 99% Winner Probability Confirmed. Consider rolling out fix-first to all users."
  NO sample ratio mismatch warning. Completed with "Roll out control".
- Must show: SRM warning, result void. Result: FAIL. Neither Flagsmith nor the pre-registered rule catches a 10% exposure loss
  at this sample size; both would ship. This confirms the dry-run finding above. Reported as is; the rule is not changed
  for the `real` experiment (that would break the pre-registration). Lesson for next time: the rule should run its own SRM check
  (for example p < 0.01 voids) instead of relying on Flagsmith's warning alone.
- Files: `2026-11-27-sim-srm-d10.log`, `2026-11-27-sim-srm-d10.txt`, `2026-11-27-sim-srm-d10-banner.jpg`,
  `2026-11-27-sim-srm-d10-exposures.jpg`.

## SRM EXTRA, drop 0.2, NOT pre-registered (exp 1425, seed 42): COMPLETE, FAIL (no SRM warning)
- Labelled extra chosen by the owner on 2026-11-27, run in its own experiment "SIM world SRM EXTRA (seed 42, n 3000, drop 0.2)".
- Sent: explain_first 1,490 exposed, 497 clean fixes (33.4%); fix_first 1,510 assigned but only 1,200 exposed (310 exposure
  events dropped), 506 (42.2%). Guardrail 8 vs 24 (0.5% vs 2.0%). 0 errors. Log: `2026-11-27-sim-srm-d20.log`.
- Our rule (no `--srm-warning`, because Flagsmith gave none): RULE 4 WIN. Our own SRM chi-square p = 2.3e-8 and the script
  prints its NOTE ("check the Flagsmith dashboard before trusting a Win"). Output: `2026-11-27-sim-srm-d20.txt`.
- Flagsmith (read 2026-11-27, "as of 16:11 UTC"): NO sample ratio mismatch warning. Exposures chart shows Control 1,490 (55%)
  vs fix-first 1,200 (45%) on a 50/50 rollout. Banner "> 99% Winner Probability Confirmed", fix-first +26.4%,
  CrI [14.1%, 38.8%], "Consider rolling out fix-first to all users". Screenshots: `2026-11-27-sim-srm-d20-banner.jpg`,
  `2026-11-27-sim-srm-d20-exposures.jpg`.
- Completed with "Roll out control" (Control rolled out to everyone in `sim`).
- Verdict: FAIL, same as the pre-registered 0.1 world, now with a far larger break. Flagsmith does not appear to run an SRM
  check at all (none shown at 52/48 or 55/45), so our rule's VOID clause, which waits for Flagsmith's warning, can never fire.
  Our own chi-square catches it and prints a NOTE, but the pre-registered rule is not changed for `real`: at analysis we
  report the script's own SRM p next to the verdict and flag any p < 0.01 by hand.

## Expected readings (offline dry runs, 2026-11-27, our rule)
Dry runs use a seeded coin for the arm (Flagsmith hashes identities instead), so live counts will differ; these show what each world
should roughly give.

| World | Seed | Dry-run counts (clean fixes; guardrail) | Our rule | Must show |
|---|---|---|---|---|
| MDE | 43 | 540/1491 (36.2%) vs 610/1509 (40.4%); 15 vs 30 | RULE 4 WIN (P 99.1%, CrI [0.73, 7.67] pts) | Win |
| Harm | 42 | 524/1483 (35.3%) vs 650/1517 (42.8%); 10 vs 86 | RULE 3 LOSE (guardrail +4.99 pts > 3) | Lose despite a better primary |
| SRM | 42 | 524/1483 vs 564/1369 exposed (10% dropped); 10 vs 18 | RULE 4 WIN unless Flagsmith warns | SRM warning, void |

Finding (SRM world): our pre-registered rule voids only on Flagsmith's SRM warning. The 10% drop gives our own chi-square
p = 0.033, so if Flagsmith's SRM check is strict (p < 0.01 or stricter) it stays quiet and the rule calls a broken experiment a Win.
`pnpm expected-loss` now prints our own SRM p (informational, the rule is unchanged) and a NOTE when p < 0.01 without `--srm-warning`.
Owner decision (2026-11-27): run BOTH. Options were: keep the pre-registered `--drop 0.1` and report whatever
Flagsmith does (honest, may show the gap), or also run `--drop 0.2` (p far below 0.001) as a labelled extra.
