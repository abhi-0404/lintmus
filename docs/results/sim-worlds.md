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

## MDE, first attempt (seed 42): ABORTED, not used
- The live run stopped at 1,500 of 3,000 identities when the Claude session that ran it closed (log: scratchpad `sim-mde.log`,
  last line "1500/3000 identities"). The SDK batches events, so the last batch was probably never flushed.
- `simulate.ts` cannot resume, and rerunning seed 42 would replay identities `sim-mde-s42-00001..01500` with duplicate events.
- Decision (owner, 2026-11-27): complete the partial experiment with "Roll out control" and do NOT read it; rerun MDE as a fresh
  experiment with seed 43 (identities `sim-mde-s43-*`, none used before). Harm and SRM keep seed 42.
- CORRECTION (session that ran it, 2026-11-27 01:40 IST): the seed 42 MDE run was NOT aborted. It was still in progress when the log
  above was read; it finished 3000/3000 with 0 errors and `close()` flushed (log copy `2026-11-27-sim-mde-s42.log`). Sent: explain_first
  1,486 exposed, 509 clean fixes (34.3%); fix_first 1,514 exposed, 618 (40.8%); guardrail 13 vs 27. Lift +19.2%. Our rule: RULE 4 WIN
  (chance to beat 99.99%, 95% CrI [3.11, 10.01] pts, expected loss 0.000, guardrail measured and not losing; own SRM p = 0.609).
  Flagsmith's reading was not yet captured (browser handed to another session). If experiment "SIM world MDE (seed 42, n 3000)" is
  still running, its data is complete and usable; a seed 43 rerun is optional.

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
