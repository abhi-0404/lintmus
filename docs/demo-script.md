# Demo video script (Track 1, Lintmus)

Status: draft written Nov 27 (night), updated Nov 28 00:45 IST with the live sim results. Beat 3 is filled on Nov 29 after the analysis (see `analysis-runbook.md`). Every other beat can be recorded on Nov 28 evening.

## Limits and ground rules
- Length: the official brief (`research/00-official/hackathon-brief.md`, fetched Nov 25) says only "short demo video" and gives no number. The plan (`04-final-plan.md` section 10) sets under 2:30. Target 2:20-2:25, hard cap 2:30. Re-check the WeMakeDevs submission form for a stated limit; if it is shorter, cut beat 5 first, then beat 4b.
- The judges score: Use of Flagsmith, Impact, Creativity, and "clearly shows problem, what you built, how Flagsmith fits". Track 1 judges also look for one experiment done well, a clear hypothesis, versions behind a flag, a metric from real events, and results you can explain.
- Say "Flagsmith Experimentation" and "multivariate flag" aloud at least once.
- Honest wording, always: every simulated number is called "simulated" on screen (caption) and in voice. Never say a simulated result is about developers. Inconclusive is a valid, pre-registered outcome, never an apology.
- Recording: 1080p, captions on, terminal font 18 or larger, dark or light theme kept consistent. Never click Refresh on camera (Refresh is rate limited to once per 5 minutes and live numbers can change mid-take); use screenshots in `docs/results/` or a pre-refreshed page.
- Do not show: `.env`, the Flagsmith "SDK Keys" page, or any account or billing page.
- Do not open the real site with your own identity to "show" a layout: that adds an exposure to the live experiment. Capture both layouts from `https://lintmus-sim-demo.vercel.app` (shows the SIMULATION DEMO banner) or a local build, or use `?internal=1` on the real site (that session never records an exposure).

## Assets and their status (checked against disk, Nov 28 00:45 IST)
| Asset | Status |
|---|---|
| Live site https://lintmus.vercel.app | 200 on Nov 28 00:40 IST (checked with curl, no login). Still check logged out in a browser before recording. |
| Sim demo https://lintmus-sim-demo.vercel.app | 200 on Nov 28 00:40 IST; same caveat. |
| Flagsmith: flag `finding_style` (control `explain_first`, variation key `fix-first`) | Done: `docs/results/2026-11-28-real-flag-config.jpg` (flag locked by running experiment 725) and `2026-11-28-real-flag-segment-split.jpg` (experiment-managed 50% segment override). |
| Flagsmith: `real` experiment 725 page | Running since 2026-11-27 00:57 IST. Result screenshot To do (Nov 29 11:00). |
| Flagsmith: metrics page | Done: `docs/results/2026-11-28-real-metrics.jpg` (4 metrics, `finding_fixed_clean` used in 1 experiment). |
| EXPERIMENT.md commit 6b82376 (2026-11-26 17:04) then real start 2026-11-27 00:57 | On disk (`EXPERIMENT.md`, `DECISION.md`). |
| A/A world: Flagsmith 90% banner + results table | On disk: `docs/results/2026-11-27-sim-aa-banner.jpg`, `...-sim-aa-results.jpg`, `2026-11-27-sim-aa.txt`. |
| MDE world (747) | On disk: `2026-11-27-sim-mde-banner.jpg`, `-mde-results.jpg`. Flagsmith > 99% winner, our rule WIN. |
| Harm world (1415) | On disk: `2026-11-27-sim-harm-banner.jpg`, `-harm-results.jpg`, `-harm.txt`. Flagsmith "> 99% winner, consider rolling out fix-first"; our rule `RULE 3: LOSE` (guardrail +5.89 points). |
| SRM worlds (1416 at 10%, 1425 at 20% extra) | On disk: `2026-11-27-sim-srm-d10-banner.jpg`, `-d10-exposures.jpg`, `-d10.txt`, and the same for `d20`. Flagsmith showed NO SRM warning in either; our rule says WIN. Reported as a failure. |
| Rollout and rollback on sim-demo | Not recorded: To do (plan Phase 5). Needs a flag change in `sim` (see beat 5), not the completed experiments. |
| Smoke run | `docs/results/2026-11-27-sim-smoke-results.jpg` (120 users; optional b-roll). |

If a world has no Flagsmith screenshot by recording time, show only what exists and drop its line from beat 4b. Do not show an offline dry run as if it were a live result.

## Shot list

| # | Time | On screen | Voiceover |
|---|---|---|---|
| 1. Problem and tool | 0:00-0:22 | Browser on lintmus.vercel.app. The puzzle is the landing state: three finding cards appear. Fix one bug in the editor (paste the corrected line), its card disappears. Optional: `Checkout_Completed` next to `checkout_completed` highlighted in the puzzle code (r03). | "Picture an experiment that runs for three days and measures nothing. No error, just one capital letter in an event name, silently ignored. Lintmus finds these silent bugs in your browser, in about a second. Nothing you paste leaves the page." |
| 2. The one experiment | 0:22-0:50 | (a) The two card layouts side by side (captures, see ground rules). (b) Flagsmith dashboard, flag `finding_style`: control `explain_first`, variation `fix-first`. (c) Experiment 725 page: hypothesis text, primary metric `finding_fixed_clean`, 50/50. (d) Terminal: `git log` showing the EXPERIMENT.md commit time before the start time in `DECISION.md`. | "Lintmus is also my test subject. How should a linter talk to you: explanation first, or the fix first? I did not guess. One multivariate flag in Flagsmith, two layouts, a real Flagsmith Experimentation run. Fix-first will obviously win raw fixes, so the question is whether it still wins once blind-paste errors count. The primary metric is clean fixes, the guardrail is new bugs. The rule for shipping was committed before the first visitor." |
| 3. Real result (fill Nov 29) | 0:50-1:15 | `real` scorecard screenshot (`docs/results/2026-11-29-real-results.jpg`), then the terminal output of `pnpm expected-loss` with the matched rule line, then the matching row of the decision table in EXPERIMENT.md highlighted. | One variant from the table below. |
| 4a. The contrast | 1:15-1:40 | Flagsmith A/A banner screenshot: "90% Winner Probability Confirmed ... Consider rolling out fix-first to all users." Caption: SIMULATED A/A, no true difference. Cut to terminal: `RULE 5: INCONCLUSIVE`, with "95% credible interval includes 0". | "Here is why I wrote the rule first. This is a simulated A/A world: both arms behave identically by construction. Flagsmith's dashboard still shows a 90 percent winner banner and says consider rolling out. Our pre-registered rule asks for more: over 95 percent, an interval that excludes zero, a small expected loss, and a guardrail that is not losing. It says inconclusive, which is the right answer. Without a rule written in advance, I would have shipped noise." |
| 4b. Other worlds | 1:40-1:58 | Harm banner screenshot ("> 99% Winner ... Consider rolling out fix-first") next to the terminal `RULE 3: LOSE` from `2026-11-27-sim-harm.txt`; then the d20 exposures chart (55% / 45%) with no warning on the page. Every image captioned SIMULATED, seed 42. | "Same real SDK, same pipeline. At the smallest effect worth shipping: a win, and Flagsmith agrees. A harmful variant: Flagsmith says roll it out, because it only sees the primary metric, while blind-paste errors went up sixteen-fold. The guardrail in our rule refuses it. And one honest miss: when I dropped a fifth of one arm's exposures, the split went 55 to 45, Flagsmith showed no warning and our rule would have shipped. So the analysis now checks the split itself. Simulated, all of it: it tests the design and the rule, not developers." |
| 5. Rollout and rollback | 1:58-2:12 | Sim-demo only. All sim experiments are already completed with control (747 included), so End Experiment is no longer available there. Instead, in environment `sim`, open flag `finding_style` and set the variant weights to 100% `fix-first` (exact click path UNVERIFIED; a fresh short sim experiment ended with "Roll out a variant" also works), reload lintmus-sim-demo to show the fix-first card, then set it back to 100% control and reload again. Never do this in `real`. | "When the rule says ship, a human ends the experiment in Flagsmith and the same flag rolls out the winner. Rollback is one flip, no deploy. This is the sim demo site, not the real one." |
| 6. Close | 2:12-2:27 | README top, live URL, repo URL (github.com/abhi-0404/lintmus). Optional, only if they exist by then: Discord staff feedback on the rules, upstream comment on Flagsmith issue #9128. | "Lintmus: the linter for Flagsmith experiments, with its own product decision made by a Flagsmith experiment, and the result reported whichever way it went. Repo and live site are in the description." |

Notes on 4b: the SRM line is earned now and must stay honest. Flagsmith did not warn at 10% or at 20% dropped (`sim-worlds.md`). Do not say "the split check voids it". If time is short, keep the harm line and cut the SRM line, never the other way round, and never cut the word "simulated".

## Beat 3 variants (use the one matching the row of EXPERIMENT.md section 8 that the runbook selected)
Fill N and the numbers from `DECISION.md`. Read the claim aloud with the caveat in the same sentence.

| Row | Voiceover |
|---|---|
| 5 Inconclusive (most likely) | "N visitors from this hackathon went through the real experiment, split between the two layouts. Raw clean-fix rates were X and Y percent. Flagsmith gives fix-first a Z percent chance to be best, and the interval still includes zero. Under the rule I wrote in advance, that is inconclusive: I do not ship, I keep the explain-first layout, and the expected loss of shipping it is W points. I said up front that a decisive result on this little traffic was unlikely. A clear 'not enough evidence' is a real result, and it is the one the A/A world just showed you can mistake for a win." |
| 2 Below minimum | "Flagsmith needs 50 exposed users and 5 conversions per arm before it shows numbers. We reached only N1 and N2. So the dashboard still says collecting data, and under the rule that is inconclusive, nothing shipped. Here are the raw counts, and our own Beta-Binomial reading, clearly labelled as not Flagsmith's number. The experiment keeps running after the hackathon." |
| 4 Win | "N visitors. Flagsmith gives fix-first a Z percent chance to be best, the interval excludes zero, expected loss of shipping is under half a point, and the guardrail is measured and not losing. By the rule, ship. I end the experiment in Flagsmith and roll out fix-first. One caveat stated by us: people fix code in their IDE, not in this text box, which favours fix-first." |
| 3 Lose | "N visitors. [Chance to beat control is under 5 percent] or [the guardrail is worse by more than 3 points]. By the rule, the explanation-first layout stays, and the experiment is ended with control." |
| 1 Void | "The split check flagged a problem [or code changed after start]. A broken experiment cannot be trusted, so the result is void: explain-first stays, and I would fix the bug and rerun." |

## If the real experiment is still inconclusive on Nov 29 (the expected case)
- It is a valid, pre-registered result (row 5, or row 2 if Flagsmith still shows collecting data). Present it first and plainly; do not hide the real beat or move it to the end.
- Keep beat 3 at about 20-25 s. Show: the real scorecard (or the collecting-data state), raw exposures and conversions per arm, "expected loss of shipping" from the CLI, and the row 5 or row 2 text from the rule table.
- Say the pre-registered expectation aloud: the plan stated "a decisive real result is possible but not expected (under 25%)" with 45-175 exposed identities, and the late start (Nov 27 00:57, about 58 hours instead of 67) shortened the window further (recorded in `DECISION.md`, deviation 1).
- Use beat 4a as the payoff: the A/A contrast shows why inconclusive is the safe, correct outcome of a strict rule.
- Beat 5 stays on the sim-demo site. Say once: "On the real site we did not ship."
- Do not call the simulated MDE win evidence about developers. Do not imply the real experiment "almost won". Do not guess the final number; read it from the screenshot.
- Rejected framings: "not enough users, sadly", "still waiting for results", "the experiment failed". The experiment ran as designed.

## Recording order and time budget
1. Nov 28 evening: beats 1, 2, 4a, 4b, 5, 6 (plan Phase 5), after the MDE, harm and SRM screenshots exist.
2. Nov 29 11:30-12:00: beat 3 after the runbook, then edit, captions, upload as unlisted, open the link logged out, put the link in the README.
3. Submission target 14:00 IST; hard floor 18:00 IST (plan); the hackathon closes Nov 29 20:00 IST and late submissions are not accepted.
