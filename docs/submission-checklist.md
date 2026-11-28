# Submission checklist (Track 1, Lintmus)

Sources: official brief (`research/00-official/hackathon-brief.md`, fetched Nov 25), plan sections 12 and 13 (`04-final-plan.md`). Status checked against the files on disk on Nov 27 (night), updated Nov 28 00:50 IST. "Owner" means Abhishek only (accounts, posting, recording, pushing, submitting). Anything not checkable from disk is marked unverified; this checklist did not contact any external service.

Deadline: Nov 29 20:00 IST, late submissions not accepted. Target 14:00 IST, hard floor 18:00 IST.

## A. What the official rules require
| Item | Status | Who | Evidence or gap |
|---|---|---|---|
| Registered on WeMakeDevs (every team member) | Done | | Owner reported done on Nov 28. |
| Team of 1-4, one project per team; Track 1 team is separate from Tracks 2 and 3 | Done | | Owner joined the Discord and reported done on Nov 28. |
| Public GitHub repo | Done | | `https://github.com/abhi-0404/lintmus`: the unauthenticated GitHub API returned 200 on Nov 28 00:40 IST, so the repo is public. `main` pushed (7340cd7). |
| README with setup steps | Done | | `README.md` "Run it" (Node 22, pnpm install, test, build, dev, `.env.example`). |
| README says how Flagsmith is used | Done | | `README.md` "How Flagsmith is used": flag, environments, keys, metrics, SDK calls with file:line, experiments, Flagsmith vs CLI (merged Nov 27, pushed 7340cd7). |
| Short demo video | To do | Owner | Not recorded. Script: `docs/demo-script.md`. Official length limit: the brief gives none ("short"); plan cap 2:30. |
| Video link in README and in the submission | To do | Owner | After upload (unlisted, tested logged out). |
| Project description for the form | Done (draft) | Owner checks | `docs/SUBMISSION.md` has the description, problem, Flagsmith usage, results and judging tables; repo and live URLs filled. Video URL and real result still to fill. |
| Track selected: Track 1 "Test Something Real" | To do | Owner | On the WeMakeDevs form. |
| Submit on WeMakeDevs, save the confirmation | To do | Owner | Plan: 13:30-14:00 on Nov 29. |
| Understand and be able to explain the code (AI assistants allowed) | To do | Owner | Walk through `src/experiment/` and `scripts/expected-loss.ts` before recording. |
| Bonus: star github.com/Flagsmith/flagsmith | Done | | Starred from the abhi-0404 account on Nov 28; GitHub API confirms it. |

## B. What the plan requires (definition of done, section 12; checklist, section 13)
| Item | Status | Who | Evidence or gap |
|---|---|---|---|
| Live URL works logged out, in incognito and with uBlock; puzzle in under 1 s | Partly done | Owner | Both sites returned 200 to an anonymous request in under 1 s on Nov 28 00:40 and 14:15 IST. Incognito and uBlock browser checks still to do. |
| Rules r01-r05 pass fixtures; settled-state and metrics tests pass; `pnpm test` and `pnpm build` output on the final commit | Done for 7b6f8b1 | Rerun on the final commit | 104 of 104 tests pass, `tsc -b && vite build` clean, app code diff against b183960 empty (only `scripts/expected-loss.ts` gained an informational SRM print in 6369c6a; decision logic unchanged): `docs/results/2026-11-28-test-build.txt`. |
| `EXPERIMENT.md` commit time precedes the `real` start and first exposure | Done | | Commit 6b82376 at 2026-11-26 17:04 IST; start 2026-11-27 00:57 IST (`EXPERIMENT.md`, `DECISION.md`). First exposure time not recorded (To do: note in README or DECISION.md). |
| Real result captured and rule applied top to bottom in `DECISION.md` | To do | Owner and lead | Nov 29 11:00. Steps in the analysis runbook; `DECISION.md` has the "Final result" template and "Verdict: Pending". |
| `EXPERIMENT.md` (hash and time quoted) | Done | | Hash and time are in the file header. |
| `ASSUMPTIONS.md` | Done, needs refresh | Lead | Written Nov 26; its status line says nothing is measured and refers to a Nov 28 08:00 pilot snapshot. Update only if the pilot is used. |
| `DECISION.md` (rule-fix log, expected loss, usage counts) | To do | Lead | Rule-fix log present ("None"), deviations 1 and 2 recorded; expected loss, usage counts and verdict pending. |
| `docs/results/`: real scorecard | To do | Owner | Nov 29 11:00. |
| `docs/results/`: A/A scorecard (labelled SIMULATED, seed, command) | Done | | `2026-11-27-sim-aa-banner.jpg`, `-sim-aa-results.jpg`, `-sim-aa.txt` (Flagsmith reading now filled in), summary in `sim-worlds.md`. |
| `docs/results/`: MDE scorecard | Done | | Experiment 747: `2026-11-27-sim-mde-banner.jpg`, `-mde-results.jpg`; Flagsmith > 99%, our rule WIN; completed with control. |
| `docs/results/`: harm scorecard | Done | | Experiment 1415: `-harm-banner.jpg`, `-harm-results.jpg`, `-harm.txt`; Flagsmith says ship, our rule LOSE (guardrail). PASS. |
| `docs/results/`: SRM scorecard | Done (result: FAIL) | | Experiments 1416 (10%) and 1425 (20% extra): `-srm-d10-*`, `-srm-d20-*`. No Flagsmith SRM warning in either; reported as a failure in README and `sim-worlds.md`; manual SRM check added to the runbook. |
| `docs/results/`: flag config and metrics page screenshots | Done | | `2026-11-28-real-flag-config.jpg`, `2026-11-28-real-flag-segment-split.jpg`, `2026-11-28-real-metrics.jpg` (environment `real`, view-only, nothing edited). |
| Rollout and one-flip rollback recorded on the sim-demo deployment | To do | Owner | Plan Phase 5. Not recorded. |
| Video: under 2:30, 1080p, captions, unlisted, tested logged out, linked in README | To do | Owner | See above. |
| Live URL in README and in the repo About | Done | | README "Live" section has both URLs; repo About homepage is https://lintmus.vercel.app, topics set on Nov 28. |
| README sections per plan 11 | Mostly done | Owner checks | Present now: live links, How Flagsmith is used with file:line, simulated results, honesty box, SRM finding, Results placeholder. "Beta feedback for Flagsmith" added (details in `docs/flagsmith-feedback.md`). "Impact" added. Still missing: video link and GIF. |
| Rule review by Flagsmith staff: `docs/rule-review.md` | To do | Owner | File does not exist; needs the Discord feedback (owner). |
| Upstream GitHub issue or docs PR, linked | Done | | Draft was a duplicate of open issue #9128, so the reproduction was posted as a comment on Nov 28 (https://github.com/Flagsmith/flagsmith/issues/9128#issuecomment-7237070153); linked in README and `docs/flagsmith-feedback.md`. |
| Blog (optional) | To do, optional | Owner | None on disk; can follow after submission. |
| `docs/HANDOFF.md` updated | Done | | Updated; add the Nov 29 entry after the analysis. |
| Reviewer pass on the final diff; every README claim vs evidence; no simulated number called real | To do | Reviewer | After the README is final. |
| No secrets in git | Done (checked Nov 28 14:15) | | `.env` is git-ignored and not tracked; only `.env.example` is tracked; no key patterns in tracked files. Re-check on the final commit. |
| No em or en dashes anywhere | Done (checked Nov 28 night) | | Re-scanned all tracked text files after the Nov 28 edits: none. Re-scan after the Nov 29 edits. |
| No AI attribution anywhere | Done (checked Nov 28 14:15) | Recheck before final push | Commit authors and messages are clean (Abhishek Kumar, kumarabhishek82929@gmail.com; no co-author lines). Docs checked 2026-11-27: no file names an AI assistant or browser tool (already reworded). Recheck right before the final push. |
| Commit and push (docs only, no `src/`) | To do | Owner | Push through the abhi-0404 login; only when asked. |

## C. Do not break the experiment
Until the analysis: no changes to `src/`, `tests/`, `scripts/` or config (voids the result, rule 1). Doc edits are safe. The final push before submission must contain docs only; verify with `git diff --stat b183960 HEAD -- src index.html vite.config.ts package.json experiment.config.json` (empty).

## D. Owner to-do list (the short version)
1. Done Nov 28: WeMakeDevs registration, Discord, Flagsmith star, repo About URL and topics.
2. Capture screenshot: real result on Nov 29 11:00 (flag config, metrics page, MDE, harm and SRM are done).
3. Discord: collect the Flagsmith staff review of the 5 rules (upstream comment on #9128 done); write `docs/rule-review.md`.
4. Record beats 1, 2, 4, 5, 6 on Nov 28 evening and beat 3 on Nov 29; upload unlisted; test logged out; put the link in the README.
5. Apply the analysis runbook at 11:00 on Nov 29 and complete the experiment in Flagsmith per the matched row.
6. Approve the final README (tool mentions already reworded), run `pnpm test` and `pnpm build`, push, submit, save the confirmation.
