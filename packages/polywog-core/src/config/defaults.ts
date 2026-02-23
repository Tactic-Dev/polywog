import type { Preferences } from '../types/run-input.js';

export const DEFAULT_PREFERENCES: Required<Preferences> = {
  internalFirst: false,
  preferSpeed: false,
  preferAccuracy: false,
  preferLowCost: false,
  allowParallel: false,
  formatProfile: 'chat',
  includeDebug: false,
};

export const DEFAULT_TIMEOUT_MS = 30_000;

export const DEFAULT_DEBUG = false;
