import { readFileSync } from 'node:fs'
import { Flagsmith, DefaultFlag } from '@flagsmith/nodejs'

export interface ExperimentConfig {
  flag: string
  control: { key: string | null; value: string }
  variation: { key: string; value: string }
  metrics: { name: string; role: string }[]
}

export function loadConfig(): ExperimentConfig {
  return JSON.parse(readFileSync(new URL('../experiment.config.json', import.meta.url), 'utf8')) as ExperimentConfig
}

/** Read a required env var or exit with a clear message (never prints values). */
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`)
    process.exit(1)
  }
  return v
}

/** Node SDK client with events on. The default handler marks values as defaults (isDefault = true). */
export function makeClient(environmentKey: string, control: string): Flagsmith {
  return new Flagsmith({
    environmentKey,
    apiUrl: process.env.FLAGSMITH_API_URL || undefined,
    enableEvents: true,
    eventProcessorConfig: process.env.FLAGSMITH_EVENTS_API_URL
      ? { eventsApiUrl: process.env.FLAGSMITH_EVENTS_API_URL }
      : undefined,
    defaultFlagHandler: () => new DefaultFlag(control, false),
  })
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
