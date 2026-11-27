# Lintmus: submission text

Toggle Wars: The Flagsmith Experimentation Hackathon (WeMakeDevs). Paste each section into the matching field of the
submission form. Source facts: `README.md`, `EXPERIMENT.md`, `DECISION.md`, `docs/results/sim-worlds.md`,
`docs/HANDOFF.md`. Anything marked PENDING is not known yet and must be filled in before submitting.

## Form fields

The official rules (hackathon brief, fetched 2026-11-25) name three required items: a public GitHub repo, a README with
setup steps and how Flagsmith is used, and a short demo video. They do not list the form's other fields, so the standard
set below is used.

| Field | Answer |
|---|---|
| Project name | Lintmus |
| Tagline (one line) | A linter for Flagsmith experiment code, that runs a real Flagsmith experiment on itself. |
| Track | Test Something Real |
| Repository | https://github.com/abhi-0404/lintmus |
| Demo video | <VIDEO_URL> |
| Live app | https://lintmus.vercel.app |
| Team size | Rules allow 1-4; fill in on the form |

## Description (about 230 words)

Most broken Flagsmith experiments do not crash. Events are switched off, an exposure is never recorded, or a metric
name is one character off, and the dashboard says "Collecting data" for two weeks. Lintmus catches those bugs before you
ship. Paste JavaScript, TypeScript or Python that uses a Flagsmith SDK and it shows each mistake with the reason it
breaks the experiment and a fix you can copy. Five rules cover the silent failures: events not enabled, a flag read with
no exposure, an event name that matches no metric, a short Python script that exits before events are sent, and the SDK
initialised twice or identified with different keys. The linting runs in the browser and the pasted code is never
uploaded.

Lintmus is also its own test subject. Every visitor who sees a finding is in a live Flagsmith experiment on the flag
`finding_style`, split 50/50: explanation first, fix behind "Show fix" (control), or the fix first with a Copy button and
the explanation behind "Why?" (variant). The primary metric is `finding_fixed_clean`, a finding fixed without creating a
new one, and a guardrail watches for blind-paste errors. The hypothesis, metrics, population and the ship or refuse rule
were written and committed before the experiment started. A simulator replays the experiment in four worlds to check the
decision rule before it touches real data.

## What problem it solves and for whom

Developers and teams setting up Flagsmith Experimentation, many for the first time. The failure is silent: a mis-set
SDK option or metric name gives an experiment that looks healthy and measures nothing, and the cost is found two weeks
later. Lintmus shows the mistake, why it breaks the experiment and the corrected code at the moment of writing.

## How Flagsmith is used

- **Multivariate flag** `finding_style` (control `explain_first`, variation key `fix-first`, value `fix_first`) decides
  the layout every visitor sees. Without Flagsmith the app has nothing to test.
- **Experimentation** on environment `real` (experiment id 725): 50/50 split, primary metric `finding_fixed_clean`
  (increase), started 2026-11-27 00:57 IST, fixed analysis time 2026-11-29 11:00 IST.
- **Events** through the browser SDK `@flagsmith/flagsmith` 12.6.0 with `enableEvents: true`: one exposure per session
  (`trackExposureEvent`) and four Occurrence metrics (`trackEvent`): `finding_fixed_clean` (primary),
  `new_finding_after_edit` (guardrail), `finding_resolved` and `fix_copied` (informational).
- **Identity-scoped flags**: the identity is passed at init so the value is known before anything renders; only a value
  that came from the Flagsmith server counts, never a default or cached one.
- **Results**: Flagsmith's Bayesian chance to beat control, delta and credible interval drive the decision.
- **Node SDK** `@flagsmith/nodejs` 9.5.0 in a separate `sim` environment for the simulated worlds (never `real`).
- Flagsmith's SRM warning is a void condition in the pre-registered rule. In the simulated worlds Flagsmith showed no SRM
  warning even at a 55/45 split, so the analysis also reports our own chi-square SRM p (see the SRM finding below).

## What is technically hard

- **Clean exposures.** One exposure per session, only for a server-served value inside the running experiment, with a
  1.5 s flag timeout that falls back to control and records nothing. Test identities, `?internal=1` sessions and
  opt-outs are excluded.
- **Metrics that cannot be gamed by half-typed code.** Metrics are computed only on settled states (4 s idle, a paste or
  a blur), a fix counts only if the per-rule anchor still exists, and a change of 60% or more of the text is a baseline.
  The logic is one pure module with unit tests, including a scripted keystroke sequence. 104 tests pass.
- **A decision rule tested before launch.** A simulator drives the real Node SDK through four worlds (no effect, the
  minimum detectable effect, a harmful variant, a broken traffic split). A separate Beta-Binomial reading, labelled
  "not Flagsmith's number", applies the ship or refuse rule.

## What is honest about limits

- Traffic is small. Expected 45-175 exposed identities; at 50 per arm only a lift above roughly +75% relative is usually
  decisive, and the pre-registration puts a decisive real result under 25%. "Inconclusive" and "below minimum" are valid
  outcomes that ship nothing.
- Late start: planned 2026-11-26 16:00 IST, actual 2026-11-27 00:57 IST (about 58 hours instead of 67). Recorded in
  `DECISION.md`; thresholds unchanged.
- The guardrail is not attached in Flagsmith (the wizard accepts one metric per experiment). It is judged from raw
  `new_finding_after_edit` counts with our own script, so it can block a ship but cannot certify safety.
- Fixing code in a text box understates real IDE fixing, more so in the control. This biases toward `fix_first`.
- Most visitors will be puzzle players on the sample snippet, many not Flagsmith users. Python rules r02 and r04 use SDK
  method names not verified against an installed Python SDK.
- All simulation parameters are assumed, tuned to hit the pre-registered targets. The simulation validates the design and
  the decision rule; it says nothing about developers.
- The events pipeline is marked experimental in the SDK, so signatures may change.

## Results: real and simulated, kept apart

### REAL experiment (live visitors, environment `real`, experiment 725)

**PENDING. Analysis is at 2026-11-29 11:00 IST. Fill this block from `DECISION.md` ("Final result") before submitting.**

| | explain_first (control) | fix_first |
|---|---|---|
| Exposed identities (Flagsmith) | <PENDING> | <PENDING> |
| `finding_fixed_clean` rate (Flagsmith) | <PENDING> | <PENDING> |
| Win probability, delta, 95% credible interval (Flagsmith) | baseline | <PENDING> |
| `new_finding_after_edit` events (our reading, not Flagsmith's number) | <PENDING> | <PENDING> |

- Pre-registered rule row matched (void, below minimum, lose, win, inconclusive): <PENDING>
- Action taken in Flagsmith: <PENDING>
- One-sentence claim: <PENDING>

### SIMULATED worlds (not real visitors, environment `sim`)

Run 2026-11-27 through the real Node SDK, 3,000 identities per world, seed 42.

| World | Sent | Flagsmith reading | Our rule |
|---|---|---|---|
| A/A (experiment 740) | control 507/1,521 clean fixes (33.3%), variant 527/1,479 (35.6%) | +6.9%, 95% CrI [-3.7%, 17.5%], 90% chance to be best; banner suggests rolling out | INCONCLUSIVE (chance to beat control 90.8%, interval includes 0); pass |
| MDE (747) | control 509/1,486 (34.3%), variant 618/1,514 (40.8%), lift +19.2% | +19.2%, 95% CrI [8.1%, 30.3%], > 99% chance to be best | WIN (99.99%, CrI [3.11, 10.01] points); both agree; pass |
| Harm (1415) | control 535/1,550 (34.5%), variant 632/1,450 (43.6%); guardrail 6 vs 91 (0.4% vs 6.3%) | +26.3%, 95% CrI [14.9%, 37.7%], > 99%; banner suggests rolling out | LOSE (guardrail worse by 5.89 points, limit 3); pass |
| Broken split, 10% exposures dropped (1416) | control 1,487 exposed, variant 1,364 of 1,513 exposed | split 52/48, +25.2%, > 99%; no SRM warning | WIN (own SRM p = 0.021); fail, should have voided |
| Broken split, 20% dropped, labelled extra (1425) | control 1,490 exposed, variant 1,200 of 1,510 exposed | split 55/45, +26.4%, > 99%; no SRM warning | WIN with the script's SRM note (own p = 2.3e-8); fail, should have voided |

Finding from the A/A world: Flagsmith's default banner recommended shipping a change with no true difference at a 90%
reading. The pre-registered rule (above 95% and an interval that excludes 0) refused it.

Finding from the harm world: Flagsmith's experiment judges only the primary metric (the guardrail cannot be attached),
so it showed "> 99% winner" for a variant that made blind-paste errors 16 times more common. The pre-registered guardrail
clause refused it.

Finding from the broken-split worlds, reported as a failure: the rule voids only on Flagsmith's SRM warning, and
Flagsmith showed none at 52/48 or at 55/45, so the rule called both broken experiments a win. The rule is unchanged
(pre-registered); the script prints its own SRM p-value and a note, and the real analysis reports that p next to the
verdict and flags p < 0.01 by hand.

## Judging criteria

| Criterion | How Lintmus meets it |
|---|---|
| Use of Flagsmith: is it core? do flags and experiments do real work? | The product's central UI is switched by a multivariate flag, and the exposure and four metrics are real Flagsmith events from live visitors. The decision to ship or refuse is read from Flagsmith's Bayesian results plus a stricter pre-registered rule. |
| Impact: real problem? would a developer or team use it? | Silent experiment bugs (events disabled, no exposure, a misspelled metric) leave an experiment on "Collecting data" for weeks, and the lint rules name each one with a copyable fix. Real demand is not yet measured; adoption evidence is the experiment's own traffic, PENDING. |
| Creativity: new idea or a familiar idea taken somewhere new? | A linter that is also the subject of its own A/B test, with the question "does showing the fix first still win once blind-paste errors are counted?". The guardrail, a simulated A/A world showing the dashboard's 90% banner would ship a no-effect change, and a harm world where the dashboard says ship while the guardrail refuses are the unusual parts. |
| Demo video: problem, what was built, how Flagsmith fits | Scripted in `docs/demo-script.md` (cap 2:30): the silent bug, the puzzle and a finding, the flag and metrics in Flagsmith, the pre-registered rule, the result. Video not recorded yet: <VIDEO_URL>. |

### Track 1 judging points (Test Something Real)

| Point | Evidence |
|---|---|
| One experiment done well beats many features | One flag, one primary metric, one guardrail, one fixed analysis time. Everything else in the app serves that experiment. |
| Clear hypothesis | Exact text in `EXPERIMENT.md` section 1, committed 2026-11-26 17:04 IST (commit 6b82376), before the real start. |
| Versions behind a flag | `finding_style`, `explain_first` vs `fix_first`, identical content, only order and default-expanded state differ. |
| Metric from real events | `finding_fixed_clean` is an Occurrence event sent by the browser SDK from live visitor edits. |
| Results you can explain | A five-row decision rule fixed in advance, the simulated worlds that test it, and a "Final result" template that is filled with real numbers only. Real result: PENDING. |

## Business lens

Who needs it: developers and product teams adopting Flagsmith Experimentation, and Flagsmith itself as an onboarding
aid, since a mis-set event option is the failure that makes a new experiment look broken. Would anyone pay or adopt: a
free browser tool or a docs companion is plausible; a paid product is unlikely on its own, since the five rules cover
SDK setup mistakes only. No demand evidence has been collected beyond the experiment's traffic. Does it scale: technically
yes, because linting runs in the browser and only five event names reach Flagsmith, with no per-user server work; cost per
user is close to static hosting plus Flagsmith event volume. Operationally the cost is rule upkeep: the rules freeze for
the experiment, the SDK events pipeline is marked experimental, and Python method names need verification. A CI or editor
version would be the natural path to regular use, but it is not built.
