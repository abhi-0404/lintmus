# Submission checklist (Track 1, Lintmus)

Sources: official brief (`research/00-official/hackathon-brief.md`, fetched Nov 25), plan sections 12 and 13 (`04-final-plan.md`). Status checked against the files on disk on Nov 27 (night). "Owner" means Abhishek only (accounts, posting, recording, pushing, submitting). Anything not checkable from disk is marked unverified; this checklist did not contact any external service.

Deadline: Nov 29 20:00 IST, late submissions not accepted. Target 14:00 IST, hard floor 18:00 IST.

## A. What the official rules require
| Item | Status | Who | Evidence or gap |
|---|---|---|---|
| Registered on WeMakeDevs (every team member) | To do (unverified) | Owner | Not checkable from disk. |
| Team of 1-4, one project per team; Track 1 team is separate from Tracks 2 and 3 | To do (unverified) | Owner | Plan asked to confirm in Discord; no confirmation on disk. |
| Public GitHub repo | Unverified | Owner | Remote `https://github.com/abhi-0404/lintmus.git`, branch main at 6369c6a, local tree clean, local ref matches origin as of the last fetch. Public visibility not checked (no external contact). Confirm logged out. |
| README with setup steps | Done | | `README.md` "Run it" (Node 22, pnpm install, test, build, dev, `.env.example`). |
| README says how Flagsmith is used | To do | Owner or doc-writer | The experiment section covers flag, metrics and exposure, but there is no dedicated "How Flagsmith is used" section naming every flag, key, metric, SDK call with file path, environment, and CLI/REST/MCP role (plan 11 and DoD item 7). |
| Short demo video | To do | Owner | Not recorded. Script: `docs/demo-script.md`. Official length limit: the brief gives none ("short"); plan cap 2:30. |
| Video link in README and in the submission | To do | Owner | After upload (unlisted, tested logged out). |
| Project description for the form | To do | Owner | Draft not on disk. Use the README opening paragraph (one-line pitch: "A linter for Flagsmith experiment code, that runs a real Flagsmith experiment on itself."). |
| Track selected: Track 1 "Test Something Real" | To do | Owner | On the WeMakeDevs form. |
| Submit on WeMakeDevs, save the confirmation | To do | Owner | Plan: 13:30-14:00 on Nov 29. |
| Understand and be able to explain the code (AI assistants allowed) | To do | Owner | Walk through `src/experiment/` and `scripts/expected-loss.ts` before recording. |
| Bonus: star github.com/Flagsmith/flagsmith | To do (unverified) | Owner | Not checkable from disk. |

## B. What the plan requires (definition of done, section 12; checklist, section 13)
| Item | Status | Who | Evidence or gap |
|---|---|---|---|
| Live URL works logged out, in incognito and with uBlock; puzzle in under 1 s | To do | Owner | HANDOFF reports both sites 200 (Nov 27 01:40); the incognito and uBlock checks are not recorded. |
| Rules r01-r05 pass fixtures; settled-state and metrics tests pass; `pnpm test` and `pnpm build` output on the final commit | To do | Owner or tester | Fixtures exist for r01-r05 in `tests/fixtures/`. HANDOFF reports 104 tests and a clean build on Nov 27 01:40. Re-run on the final commit and keep the output. |
| `EXPERIMENT.md` commit time precedes the `real` start and first exposure | Done | | Commit 6b82376 at 2026-11-26 17:04 IST; start 2026-11-27 00:57 IST (`EXPERIMENT.md`, `DECISION.md`). First exposure time not recorded (To do: note in README or DECISION.md). |
| Real result captured and rule applied top to bottom in `DECISION.md` | To do | Owner and lead | Nov 29 11:00. Steps in the analysis runbook; `DECISION.md` has the "Final result" template and "Verdict: Pending". |
| `EXPERIMENT.md` (hash and time quoted) | Done | | Hash and time are in the file header. |
| `ASSUMPTIONS.md` | Done, needs refresh | Lead | Written Nov 26; its status line says nothing is measured and refers to a Nov 28 08:00 pilot snapshot. Update only if the pilot is used. |
| `DECISION.md` (rule-fix log, expected loss, usage counts) | To do | Lead | Rule-fix log present ("None"), deviations 1 and 2 recorded; expected loss, usage counts and verdict pending. |
| `docs/results/`: real scorecard | To do | Owner | Nov 29 11:00. |
| `docs/results/`: A/A scorecard (labelled SIMULATED, seed, command) | Done | | `2026-11-27-sim-aa-banner.jpg`, `-sim-aa-results.jpg`, `-sim-aa.txt`, `-sim-aa.log`, summary in `sim-worlds.md`. Flagsmith reading is recorded in `sim-worlds.md`; the `.txt` still says "Pending" for it. |
| `docs/results/`: MDE scorecard | To do | Owner | Seed 42 run finished 3,000 of 3,000 (`2026-11-27-sim-mde-s42.log`), our rule reads RULE 4 WIN. Flagsmith reading and screenshot: to do (needs the browser), then complete the experiment. |
| `docs/results/`: harm scorecard | To do | Owner or lead | Not run live; offline dry run only. |
| `docs/results/`: SRM scorecard | To do | Owner or lead | Not run live. The 10% drop may not trigger Flagsmith's warning (`sim-worlds.md`); a labelled `--drop 0.2` extra was chosen. |
| `docs/results/`: flag config and metrics page screenshots | To do | Owner | Not on disk. Only the smoke screenshot (`2026-11-27-sim-smoke-results.jpg`) and the A/A images exist. |
| Rollout and one-flip rollback recorded on the sim-demo deployment | To do | Owner | Plan Phase 5. Not recorded. |
| Video: under 2:30, 1080p, captions, unlisted, tested logged out, linked in README | To do | Owner | See above. |
| Live URL in README and in the repo About | To do | Owner | `README.md` does not contain the URL (checked). Repo About is a GitHub setting, unverified. |
| README sections per plan 11 | To do | Doc-writer, then Owner checks | Present: pitch, rules table, the experiment (hypothesis, variants, metrics, honesty bullets, 97.5% note), run it, layout, license. Missing: live and video links and GIF, problem bullets with docs links, "How Flagsmith is used" with file:line, results (real separate from simulated), honesty box (traffic mix, in-textarea bias, sim limits), Impact, known undetected failures, Beta feedback for Flagsmith. The "Status" section still says results will be added. |
| Rule review by Flagsmith staff: `docs/rule-review.md` | To do | Owner | File does not exist; needs the Discord feedback (owner). |
| Upstream GitHub issue or docs PR, linked | To do | Owner | No file or link on disk. |
| Blog (optional) | To do, optional | Owner | None on disk; can follow after submission. |
| `docs/HANDOFF.md` updated | Done | | Updated; add the Nov 29 entry after the analysis. |
| Reviewer pass on the final diff; every README claim vs evidence; no simulated number called real | To do | Reviewer | After the README is final. |
| No secrets in git | Done (checked Nov 27) | | `.env` is git-ignored and not tracked; only `.env.example` is tracked. Re-check on the final commit. |
| No em or en dashes anywhere | Done (checked Nov 27) | | Searched `*.md`, `*.ts`, `*.tsx`, `*.json`, `*.html` outside `node_modules`, `dist`, `.git`: none. The new docs of Nov 27 night were written without them; re-scan after the Nov 29 edits. |
| No AI attribution anywhere | To do | Owner | Commit authors and messages are clean (Abhishek Kumar, kumarabhishek82929@gmail.com; no co-author lines). Docs checked 2026-11-27: no file names an AI assistant or browser tool (already reworded). Recheck right before the final push. |
| Commit and push (docs only, no `src/`) | To do | Owner | Push through the abhi-0404 login; only when asked. |

## C. Do not break the experiment
Until the analysis: no changes to `src/`, `tests/`, `scripts/` or config (voids the result, rule 1). Doc edits are safe. The final push before submission must contain docs only; verify with `git diff --stat b183960 HEAD -- src index.html vite.config.ts package.json experiment.config.json` (empty).

## D. Owner to-do list (the short version)
1. WeMakeDevs registration, team and Discord compliance confirmed; star the Flagsmith repo.
2. Check the repo is public and set the About URL and topics.
3. Capture screenshots: flag config, metrics page, MDE, harm, SRM (after they are run), real result on Nov 29 11:00.
4. Discord: collect the Flagsmith staff review of the 5 rules; file the upstream issue or docs PR; write `docs/rule-review.md`.
5. Record beats 1, 2, 4, 5, 6 on Nov 28 evening and beat 3 on Nov 29; upload unlisted; test logged out; put the link in the README.
6. Apply the analysis runbook at 11:00 on Nov 29 and complete the experiment in Flagsmith per the matched row.
7. Approve the final README, reword the two tool mentions, run `pnpm test` and `pnpm build`, push, submit, save the confirmation.
