import type { Rule } from '../types.ts'
import { r01 } from './r01-enable-events.ts'
import { r02 } from './r02-no-exposure.ts'
import { r03 } from './r03-event-name.ts'
import { r04 } from './r04-python-buffer.ts'
import { r05 } from './r05-duplicate-init.ts'

/** The five rules that ship. Frozen once the real experiment starts (see EXPERIMENT.md). */
export const RULES: Rule[] = [r01, r02, r03, r04, r05]
