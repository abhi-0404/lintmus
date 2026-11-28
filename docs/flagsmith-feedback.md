# Beta feedback for Flagsmith Experimentation

From building Lintmus and running seven experiments on Flagsmith Cloud (Nov 26-28, 2026): one real experiment (725),
one smoke experiment (721) and five simulated worlds in a separate `sim` environment (740, 747, 1415, 1416, 1425). Every point below is something we
observed or read in the shipped SDK code; the evidence is linked. Simulated numbers are labelled as such.

## Experiment results page

1. **No sample ratio mismatch warning, even on a clearly broken split.** SIMULATED experiment 1425: 50/50 rollout,
   1,490 vs 1,200 exposed (55% / 45%), chi-square p = 2.3e-8. The page showed the split in the exposures chart and a
   "> 99% Winner Probability Confirmed" banner, with no SRM warning. Same at 52% / 48% (experiment 1416, p = 0.021).
   Evidence: `docs/results/2026-11-27-sim-srm-d20-banner.jpg`, `-d20-exposures.jpg`, `sim-worlds.md`.
   Ask: show an SRM check next to the exposures (expected vs observed split and a p-value), and suppress or flag the
   winner banner when it fails.

2. **Only one metric per experiment, so there is no guardrail.** The experiment wizard accepted one metric. In the
   SIMULATED harm world (experiment 1415) the variant raised the primary metric but made the guardrail event 16 times
   more common (0.4% vs 6.3%). The page said "> 99% Winner Probability Confirmed. Consider rolling out fix-first to all
   users." Evidence: `docs/results/2026-11-27-sim-harm-banner.jpg`, `2026-11-27-sim-harm.txt`.
   Ask: guardrail metrics with a "must not get worse by more than X" threshold that blocks the rollout suggestion.

3. **The rollout suggestion appears at 90%.** SIMULATED A/A world (experiment 740), no true difference by construction:
   "90% Winner Probability Confirmed. Consider rolling out fix-first to all users", while the 95% credible interval
   was [-3.7%, 17.5%] and included 0. Evidence: `docs/results/2026-11-27-sim-aa-banner.jpg`.
   Ask: a configurable decision threshold per experiment, and no "consider rolling out" while the interval includes 0.

4. **The "Complete experiment" dialog pre-selects "Roll out a variant".** Ending an experiment with one click on
   "Complete experiment" ships the variant to 100% of users. A safer default is no preselection, or "Roll out control".

5. **Refresh is rate limited and results compute asynchronously.** After Refresh the page shows "Computing... results
   will update automatically" for several seconds, and refreshes are limited (we kept to once per 5 minutes). Fine for
   real use; worth stating on the page so a reader does not mistake an empty card for "no data".

## SDKs (`@flagsmith/flagsmith` 12.6.0, `@flagsmith/nodejs` 9.5.0)

Read from the installed type definitions and shipped code (`docs/sdk-facts.md`).

6. **`enableEvents` fails silently in the browser and loudly in Node.** Without `enableEvents: true`, browser
   `trackEvent` and `trackExposureEvent` are no-ops with no error, while the Node client throws. This silent browser
   failure is the first rule Lintmus checks (r01). Ask: a console warning in the browser SDK when an event call is
   dropped because events are off.

7. **`getExperimentFlag` records an exposure as a side effect.** Reading the flag also sends `$flag_exposure` (when
   events are on, an identity is set, the identity is in the experiment and the value came from the server). That is
   convenient, but it means a re-render that reads the flag again is a second exposure call. Ask: say this in the docs
   next to the method, and mention `getAllFlags()` as the read with no side effect.

8. **No unload handling in the browser SDK.** There is no `pagehide` or `visibilitychange` flush and no `keepalive`, so
   a conversion just before the tab closes can be lost unless the app calls `flushEvents()` itself (Lintmus does,
   `src/experiment/flagsmith.ts:122`). Browser `close()` also requires a timeout argument.

9. **The control arm's `variant` is the string `"control"`.** Verified on Flagsmith Cloud; not stated in the types.
   Worth documenting, since analysis code keys on it.

10. **The events pipeline is marked `@experimental @internal` in the JS types**, while the experiments product depends
    on it. Either the marker or the docs should change, so users know whether the signatures are stable.

## Upstream (posted Nov 28)

Not filed as a new issue: it duplicates open issue [#9128](https://github.com/Flagsmith/flagsmith/issues/9128) (SRM p-value null when the flag's default variant
weights are 0, which experiment creation sets). Our Cloud reproduction and the banner point were posted as a
[comment on #9128](https://github.com/Flagsmith/flagsmith/issues/9128#issuecomment-7237070153). The original draft is kept below for reference.

### Original draft (not filed)

Title: Experiment results: show a sample ratio mismatch (SRM) check

Body:

> On Flagsmith Cloud, an experiment with a 50/50 rollout showed 1,490 vs 1,200 exposed identities (55% / 45%,
> chi-square p about 2e-8) and the results page still showed "> 99% Winner Probability Confirmed" with no warning.
> The data came from a simulation through `@flagsmith/nodejs` 9.5.0 where 20% of one arm's exposure events were
> dropped on purpose, which is the classic symptom of an exposure bug. A broken split usually means the arms are no
> longer comparable, so the winner banner is misleading.
>
> Suggestion: next to the exposures chart, show the expected and observed split with an SRM p-value, warn below a
> threshold (p < 0.001 is common), and hold back the "consider rolling out" suggestion while the warning is shown.
>
> Happy to share screenshots and the simulator (github.com/abhi-0404/lintmus, `scripts/simulate.ts --world srm`).
