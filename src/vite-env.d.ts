/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client-side Flagsmith environment key for this deployment (real or sim). Empty: tracking is off. */
  readonly VITE_FLAGSMITH_ENVIRONMENT_KEY?: string
  /** Set to "sim" on the lintmus-sim-demo deployment to show the SIMULATION DEMO banner. */
  readonly VITE_LINTMUS_ENV?: string
  /** Self-hosted Flagsmith only. */
  readonly VITE_FLAGSMITH_API_URL?: string
  readonly VITE_FLAGSMITH_EVENTS_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
