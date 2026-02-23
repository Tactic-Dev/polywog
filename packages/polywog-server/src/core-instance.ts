import { createPolywogCore } from '@polywog/core';
import {
  mockInterpreter,
  mockRouter,
  mockWeave,
  mockExecutor,
  mockFormat,
  mockLedger,
} from './mock-modules.js';

export const core = createPolywogCore({
  modules: {
    interpreter: mockInterpreter,
    router: mockRouter,
    weave: mockWeave,
    executor: mockExecutor,
    format: mockFormat,
    ledger: mockLedger,
  },
  defaults: {
    debug: true,
    preferences: {
      includeDebug: true,
      formatProfile: 'api',
    },
  },
});
