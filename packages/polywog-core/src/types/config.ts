import type {
  InterpreterModule,
  RouterModule,
  LedgerModule,
  WeaveModule,
  ExecutorModule,
  FormatModule,
} from './modules.js';
import type { LifecycleHooks } from './hooks.js';
import type { Preferences } from './run-input.js';

export interface Logger {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}

export interface StageToggles {
  interpreter?: boolean;
  router?: boolean;
  weave?: boolean;
  executor?: boolean;
  format?: boolean;
}

export interface PolywogCoreConfig {
  modules: {
    interpreter: InterpreterModule;
    router: RouterModule;
    weave: WeaveModule;
    executor: ExecutorModule;
    format: FormatModule;
    ledger?: LedgerModule;
  };
  defaults?: {
    preferences?: Preferences;
    timeoutMs?: number;
    debug?: boolean;
  };
  featureFlags?: Record<string, boolean>;
  stageToggles?: StageToggles;
  hooks?: LifecycleHooks;
  logger?: Logger;
}
