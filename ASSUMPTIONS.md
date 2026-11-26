# Simulation assumptions

Every number the simulated worlds use. The simulation validates the design and the decision rule; it says nothing about developers.

Status key: MEASURED (n, source) or ASSUMED (reason). As of 2026-11-26 NOTHING is measured: there is no pilot data yet (the Nov 28 08:00 pilot snapshot, plan section 3.7, is the planned source for any parameter with n >= 30). Until then every value below is ASSUMED and was tuned to hit the pre-registered targets (35% baseline, +18% relative lift in the MDE world, a guardrail loss above 3 points in the harm world). When pilot data arrives, replace the row, keep the old value in the "was" column, and rerun `pnpm power`.

Code: `scripts/sim/model.ts` (constants `SHARED`, `CONTROL`, `FIX_FIRST_MDE`, `FIX_FIRST_HARM`, `worldParams`). Determinism: `scripts/sim/prng.ts` (mulberry32, one stream per user from `(seed, index)`).

## Model structure (assumed, by design)
A user has three latent traits drawn independently of the arm: experience, patience, bug count. All randomness is drawn in a fixed order per user (common random numbers), so the same person behaves the same in both arms except where a mechanism differs. The variant changes mechanisms only, never an outcome directly:
1. P(reads the explanation), 2. P(sees the corrected snippet), 3. P(a blind paste of the fix leaves a new finding), plus P(Copy click | saw the fix) for the manipulation-check metric.

Per engaged user, up to `min(bugs, tries)` fix attempts. An attempt succeeds cleanly if the user read AND understood the explanation (hand fix, no blind-paste risk), or saw the fix AND applied it; a fix applied without understanding can leave a new finding (blind paste). Metrics: `finding_resolved` = any successful attempt; `finding_fixed_clean` = a successful attempt without a new finding; `new_finding_after_edit` = any blind-paste error; `fix_copied` = saw the fix and clicked Copy. Simplification: the real metric is evaluated per settled state, the model per attempt.

## Shared constants (both arms, every world)
| Parameter | Value | Status | Reason |
|---|---|---|---|
| Engage base, `engageBase` | 0.55 | ASSUMED | Puzzle players who never touch the code exist; chosen with the other shared constants so the control clean-fix rate is about 35%. |
| Engage patience slope | 0.4 per unit (centred at 0.5) | ASSUMED | More patient users engage more; keeps P(engage) in 0.35-0.75. |
| Understand base / slope | 0.2 + 0.5 * experience | ASSUMED | Experienced developers translate the prose into a fix more often. |
| P(applies a seen fix) | 0.8 | ASSUMED | A visible snippet is usually applied correctly, not always. |
| Blind-paste shield | risk * (1 - 0.6 * experience) | ASSUMED | Experienced users notice a pasted placeholder or duplicate. |
| Bug count P(1) / P(2) / P(3) | 0.40 / 0.35 / 0.25 | ASSUMED | The puzzle plants 3 bugs; people who bring their own code often have fewer. |
| Tries per engaged user | 1, +1 if patience > 0.4, +1 if patience > 0.8 | ASSUMED | More patient users make more attempts. |
| Experience, patience distribution | mean of two uniforms (triangular, mean 0.5) | ASSUMED | Unimodal, no pilot data to say otherwise. |
| Max attempts | 3 | ASSUMED | Matches the 3 planted bugs. |

## Per-arm mechanisms
| Mechanism | explain_first (control) | fix_first, MDE and SRM worlds | fix_first, harm world | Status | Reason |
|---|---|---|---|---|---|
| P(reads explanation) | 0.87 | 0.40 | 0.40 | ASSUMED | Control shows the explanation expanded; fix_first collapses it behind "Why?", so fewer read it. |
| P(sees fix) | 0.30 | 0.75 | 0.90 | ASSUMED | Control hides the snippet behind "Show fix"; fix_first expands it. 0.75 not 1.0 because some people stop at the title. Harm world: the fix is seen even more often, so raw resolves rise further. |
| Blind-paste risk (base) | 0.10 | 0.06 | 0.20 | ASSUMED | MDE: pasting over a visible snippet with context is a little safer than the control's rare "Show fix" paste. Harm: double the control's base risk (the plan's "blind paste doubles"). |
| P(Copy click given saw fix) | 0.30 | 0.55 | 0.55 | ASSUMED | The Copy button is prominent only in fix_first; informational metric, never decides anything. |

Control arm and `aa` world use the control column for both arms (the variant is ignored).

## Worlds (plan section 3.7)
| World | Setup | Expected result of the model (Monte Carlo, 100k users, rates among exposed) |
|---|---|---|
| `aa` | Both arms use the control mechanisms | clean 34.9% vs 34.9%, guardrail 0.9% vs 0.9%, resolved 35.5% vs 35.5% |
| `mde` | Control vs `FIX_FIRST_MDE`, tuned for +18% relative | clean 34.9% vs 41.3% (+18.3%), guardrail 0.9% vs 1.7% (+0.8 points), resolved 35.5% vs 42.3%, copied 6.5% vs 25.1% |
| `harm` | Control vs `FIX_FIRST_HARM`: more raw resolves, blind-paste risk 0.20 | clean 34.9% vs 42.7% (+22%), guardrail 0.9% vs 6.7% (+5.8 points), resolved 35.5% vs 46.5%. Primary looks good, guardrail is losing: the rule must refuse (rule 3). |
| `srm` | `mde` mechanisms; 10% of `fix_first` exposures dropped (default, `--drop` overrides) | Same per-user outcomes as `mde`; exposures about 1,350 vs 1,500. Outcomes of dropped identities are not counted (Flagsmith attributes events to exposed identities) but their events are still sent live. |

## Other assumed numbers
| Parameter | Value | Status | Reason |
|---|---|---|---|
| Baseline clean-fix rate | about 35% (model gives 34.9%) | ASSUMED | Plan section 3.6 sizing baseline. No pilot yet. |
| Baseline guardrail rate | about 0.9% | ASSUMED | Falls out of the model (blind paste is rare in control because few people see the fix). Real value may be higher. Matters for the 5-event floor on real traffic. |
| Sim size | 3,000 identities (1,500 per arm), seed 42 | ASSUMED | Plan 3.6: at 35% baseline and +18% relative, P(beat) > 95% in about 97% of reruns. `pnpm power` gives 96.5% (binomial) and 96.8% (model). |
| Arm assignment in dry run | seeded 50/50 coin per identity | ASSUMED | Flagsmith hashes identities; live runs always take the arm from Flagsmith, never from the model. |
| Throttle | 10 identities per second | ASSUMED | Plan 3.7. 3,000 identities take about 5 minutes. |
| Identity names | `sim-<world>-s<seed>-<5 digits>` | design | Prefix per world; the seed is in the name so reruns with a new seed never reuse identities. |
| SRM test used by `power.ts` | chi-square, 1 degree of freedom, alpha 0.01 | ASSUMED | Flagsmith's own SRM threshold is not documented in the repo. See below. |
| Posterior draws | 2,000 per comparison in `power.ts`, 100,000 in `expected-loss.ts` | design | Speed in the 1,000-rerun check; accuracy for a single reading. |
| Prior | Beta(1, 1) | ASSUMED | Uniform, no prior information. Flagsmith's own prior may differ, so our numbers can differ slightly from the dashboard. |

## Known limits, stated honestly
- The mechanism values were tuned to reproduce the pre-registered targets, so "the MDE world shows a +18% lift" is true by construction. What the worlds test is the machinery: pipeline, metrics, Flagsmith's numbers, and our decision rule, not whether fix-first helps developers.
- SRM detectability: with a 10% drop at 1,500 per arm, a chi-square test flags it in about 79% (p<0.05), 58% (p<0.01) and only 31% (p<0.001) of reruns. If Flagsmith's SRM warning is strict, the default 10% drop may not trigger it at n = 3,000. `pnpm simulate -- --world srm --drop 0.2` (or more identities) flags it in about 99% even at p<0.001. Decide after the first live SRM run; the plan keeps 10% as the default.
- The harm world's primary (clean fix) also improves (+22%). That is deliberate: it shows the guardrail, not the primary, is what stops the ship.
- No real-user distribution is known for experience, patience or bug count.
