# SDK facts (scout, Phase 0)

Source: installed type definitions and bundled code, read on 2026-11-25. Nothing was run against Flagsmith (no keys yet).

- `@flagsmith/flagsmith` 12.6.0, files read: `node_modules/@flagsmith/flagsmith/types.d.ts`, `flagsmith-core.d.ts`, `event-processor.d.ts`, `evaluation-context.d.ts`, plus `index.mjs` for behaviour the types do not state.
- `@flagsmith/nodejs` 9.5.0, files read: `node_modules/@flagsmith/nodejs/build/esm/sdk/index.d.ts`, `types.d.ts`, `models.d.ts`, `events.d.ts`.
- Python SDK: NOT installed, NOT checked. Every Python name below is UNVERIFIED.

Tags: VERIFIED = read in a .d.ts or the shipped JS. UNVERIFIED = not confirmed.

## Result against the plan: all JS and Node names exist

`getExperimentFlag`, `trackExposureEvent`, `trackEvent`, `flushEvents`, `close()`, `enableEvents` and identity-in-init all exist in both SDKs. Differences from what the plan implies are listed under "Mismatches and risks" at the end. The events pipeline is marked `@experimental @internal` in the JS types, so signatures may move.

## Browser SDK: `@flagsmith/flagsmith` 12.6.0 (VERIFIED)

Default export is a singleton `flagsmith: IFlagsmith`. `createFlagsmithInstance<F, T>()` makes a separate instance.

### Init (enableEvents, identity, default handler)
```ts
init: (config: IInitConfig) => Promise<void>

interface IInitConfig {
  environmentID?: string            // client-side environment key
  identity?: IIdentity              // string. Identity-in-init: loads identity-scoped flags on the first fetch
  traits?: ITraits
  evaluationContext?: ClientEvaluationContext   // alternative: { environment: {apiKey}, identity: { identifier, traits } }
  defaultFlags?: IFlags             // the "default handler": used when no server/cache value is available
  enableEvents?: boolean            // @experimental. Starts the EventProcessor
  eventProcessorConfig?: { eventsApiUrl?: string; maxBuffer?: number; flushInterval?: number }
                                    // throws at init if given without enableEvents: true
  onChange?: (prev, params: IRetrieveInfo, loadingState: LoadingState) => void
  onError?: (err: Error) => void
  preventFetch?: boolean
  cacheFlags?: boolean              // a cache is a non-server source (see below)
  // ...plus api, realtime, enableAnalytics, fetch, headers, state, etc.
}
```
Defaults in the shipped code: events API `https://events.api.flagsmith.com/` (endpoint `<url>v1/events`), `maxBuffer` 1000, `flushInterval` 10000 ms.

There is no timeout option in `init`. The plan's 1.5 s timeout must be implemented in the app (race `init()` against a timer, or render from `defaultFlags` and only accept a server value that arrives in time).

### Experiment and event calls
```ts
getExperimentFlag: (featureName: string) => IFlagsmithFeature | null
trackExposureEvent: (featureName: string, opts?: { identifier?: string | null; value?: IFlagsmithValue; traits?: ITraits; metadata?: Record<string, unknown> }) => void
trackEvent: (event: string, opts?: { identifier?: string | null; value?: IFlagsmithValue; traits?: ITraits; metadata?: Record<string, unknown> }) => void
flushEvents: () => Promise<void>
close: (timeoutMs: number) => Promise<void>        // timeoutMs is REQUIRED in the browser types
readonly eventsEnabled: boolean
```
- `trackEvent` and `trackExposureEvent` are no-ops when `enableEvents` is not set. `identifier` defaults to the current identity; when none resolves, the exposure is skipped with a log.
- `trackEvent` THROWS if the event name starts with `$` (reserved). Wrap calls in try/catch in the app.
- `trackExposureEvent` emits the reserved event `$flag_exposure`. The EventProcessor de-duplicates exposures by an internal key (event, feature, identifier, value, ...), so a repeated identical exposure is buffered once; do not rely on it, fire once per session ourselves.
- `getExperimentFlag(name)` reads the flag AND records an exposure itself (verified in `index.mjs`). It records only if: events are on, an identity is set, the flag exists and is enabled, `flag.experiment.inExperiment` is true, and `loadingState.source === 'SERVER'`. Otherwise it returns the flag (or null) and logs why. It sends `value: flag.variant` and `metadata: { experiment_id }`.
- If `getExperimentFlag` is used, do NOT also call `trackExposureEvent` for the same flag, and keep it out of `FindingList` re-renders. The plan places the exposure in `FindingList` by a manual `trackExposureEvent`; for that, read the flag with `flagsmith.getAllFlags()['finding_style']` (no analytics side effect, no exposure) and call `trackExposureEvent('finding_style', { value: flag.variant, metadata: { experiment_id: flag.experiment.id } })` yourself, to match what `getExperimentFlag` would send.
- `flushEvents()` forces `eventProcessor.flush()`; it resolves immediately if events are off. `close(timeoutMs)` stops polling and realtime, sends buffered events and resolves after `timeoutMs` at the latest; unsent events are then dropped; never rejects.

### Server value vs default-handler value (VERIFIED)
```ts
loadingState?: { error: Error | null; isFetching: boolean; isLoading: boolean; source: FlagSource }
enum FlagSource { NONE = 'NONE', DEFAULT_FLAGS = 'DEFAULT_FLAGS', CACHE = 'CACHE', SERVER = 'SERVER' }
onChange params: IRetrieveInfo { isFromServer: boolean; flagsChanged; traitsChanged }

interface IFlagsmithFeature { id?; enabled: boolean; value; variant?: string; reason?: string; experiment?: IFlagsmithExperiment }
interface IFlagsmithExperiment { id: number; name: string; inExperiment: boolean }
```
- A value is a real server value only when `flagsmith.loadingState.source === FlagSource.SERVER` (or `onChange` was called with `isFromServer: true`). `DEFAULT_FLAGS` is the default handler. `CACHE` is a cached value and also must not count as server for exposure.
- Enrolment: `flag.experiment?.inExperiment === true`. A `variant` alone cannot tell: an identity outside the rollout still gets a variant.
- A flag object does NOT carry its own "isDefault" marker in the browser SDK; use `loadingState.source`.
- Gate exposure on: `source === 'SERVER'` AND `flag.experiment?.inExperiment` AND identity not `test-` AND not `?internal=1`.

### Page unload
`index.mjs` contains no `pagehide`, `visibilitychange`, `beforeunload` or `keepalive` handling. The app must call `flushEvents()` itself on `pagehide` and on `visibilitychange` to hidden. A fetch started at unload may still be cancelled by the browser (the SDK does not set `keepalive`); `flushEvents()` is best effort. Test in Phase 1 (closing the tab right after a conversion).

## Node SDK: `@flagsmith/nodejs` 9.5.0 (VERIFIED)

Named export `Flagsmith` (also `DefaultFlag`, `BaseFlag`, `Flag`, `Flags`, `ExperimentMetadata`, `EventProcessor`, `FLAG_EXPOSURE_EVENT`, `DEFAULT_EVENTS_API_URL`). ESM import works under plain Node.
```ts
new Flagsmith(config: FlagsmithConfig)
// FlagsmithConfig (relevant): environmentKey, apiUrl, enableLocalEvaluation, requestTimeoutMs, retries,
//   defaultFlagHandler?: (featureName: string) => DefaultFlag,
//   enableEvents?: boolean            // default false; required by the three calls below
//   eventProcessorConfig?: { eventsApiUrl?: string; maxBuffer?: number /*1000*/; flushInterval?: number /*10000 ms, 0 disables the timer*/; requestTimeoutMs?: number /*3000*/ }  // throws without enableEvents

getExperimentFlag(featureName: string, identifier: string, traits?): Promise<Flag | DefaultFlag>   // throws if enableEvents unset
trackEvent(event: string, opts?: { identifier?: string; value?; traits?; metadata? }): void        // throws if enableEvents unset, or name starts with '$'
trackExposureEvent(featureName: string, opts: { identifier: string; value?; traits?; metadata? }): void   // throws if enableEvents unset
flushEvents(): Promise<void>      // resolves immediately if events off
close(timeoutMs?: number): Promise<void>   // timeoutMs OPTIONAL here; if omitted waits until sent or dropped
```
- Note the asymmetry: Node `trackEvent`/`trackExposureEvent`/`getExperimentFlag` THROW when `enableEvents` is off; the browser SDK silently no-ops.
- `getExperimentFlag` fetches the identity flags, and records `$flag_exposure` if the identity is enrolled in a running experiment on the feature. If the flag is not found it returns the `defaultFlagHandler` result, or a disabled flag with `isDefault` set.
- Default vs server: `flag.isDefault` (`BaseFlag.isDefault: boolean`, true for `DefaultFlag`). Enrolment: `flag.experiment?.inExperiment` (only on `Flag`, not `DefaultFlag`). Variant key: `flag.variant`. Also `flag.reason`.
- Event buffering: events flush every 10 s or when the buffer is full; scripts must `await client.close(ms)` (or `flushEvents()`) before exit or events are lost. A failed batch is retried; a dropped batch is logged through the pino logger (so ping/smoke show failures in the log).

## Python SDK (UNVERIFIED)
Not installed or read. The plan's r02 and r04 use these names, all UNVERIFIED and should be confirmed before the rules are labelled final: `enable_events=True`, `max_buffer_items`, an experiment flag method (assumed `get_experiment_flag`), `track_event`, `track_exposure_event`, and a flush/close method. Rules r02 and r04 only match on these names for Python; r04 is labelled "Possible issue" for that reason. Minimum version from the plan: Python `flagsmith` 6.3.0. To close this: `uv run --with flagsmith==<latest> python -c "import flagsmith, inspect"` in a throwaway env (needs approval to download).

## Mismatches and risks versus the plan
1. No mismatch in names: everything the plan lists exists in JS and Node.
2. `getExperimentFlag` exposes on its own. The plan's "trackExposureEvent in FindingList" is possible only if the app reads the flag without `getExperimentFlag` (use `getAllFlags()`), otherwise exposure fires twice or from the wrong place.
3. Browser `close(timeoutMs)` needs the argument. Node `close(timeoutMs?)` does not.
4. No SDK-level timeout and no unload flush: both are app responsibilities (plan already lists both).
5. Node throws when events are off; the browser silently ignores. r01 describes the silent browser case.
6. `loadingState.source` can be `CACHE`; the plan only mentions "default handler or the 1.5 s timeout". Treat anything but `SERVER` as not exposable, and consider `cacheFlags: false` for the experiment flag.
7. What `variant` is for the control arm (undefined, "control" or the option value) is not stated in the types. Check in the smoke experiment before writing exposure value logic.
8. Events API URL default `https://events.api.flagsmith.com/`; a self-hosted Flagsmith needs `eventProcessorConfig.eventsApiUrl` (`FLAGSMITH_EVENTS_API_URL` in `.env.example`).

## Verified on Flagsmith Cloud (Nov 27, sim smoke experiment 721)
- Item 7 closed: the control arm's `flag.variant` is the string `"control"`; the variation's is its key `"fix-first"`. Values are `explain_first` / `fix_first`.
- An identity in a running experiment gets `experiment: { id, name, inExperiment: true }` and `isDefault: false` from `getIdentityFlags`.
- The experiment wizard takes ONE metric (the primary) with an expected direction; picking another metric replaces it. The guardrail
  `new_finding_after_edit` cannot be attached in the UI, so the guardrail reading comes from our own counts (`expected-loss.ts`) or the API.
