import type { Preferences } from '../types/run-input.js';
import type { PolywogCoreConfig } from '../types/config.js';
import { DEFAULT_PREFERENCES, DEFAULT_TIMEOUT_MS, DEFAULT_DEBUG } from './defaults.js';

export interface ResolvedDefaults {
  preferences: Required<Preferences>;
  timeoutMs: number;
  debug: boolean;
}

export function resolveDefaults(config: PolywogCoreConfig): ResolvedDefaults {
  return {
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(config.defaults?.preferences ?? {}),
    },
    timeoutMs: config.defaults?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    debug: config.defaults?.debug ?? DEFAULT_DEBUG,
  };
}

export function mergePreferences(
  defaults: Required<Preferences>,
  overrides?: Preferences,
): Required<Preferences> {
  if (!overrides) return defaults;
  const merged = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof Preferences)[]) {
    const val = overrides[key];
    if (val !== undefined) {
      (merged as Record<string, unknown>)[key] = val;
    }
  }
  return merged;
}
