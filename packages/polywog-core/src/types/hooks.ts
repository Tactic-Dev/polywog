import type { PolywogRunInput } from './run-input.js';
import type { PolywogRunResult } from './run-result.js';

export type StageName = 'interpreter' | 'router' | 'weave' | 'executor' | 'format';

export interface LifecycleHooks {
  beforeRun?: (input: PolywogRunInput) => void | Promise<void>;
  afterRun?: (result: PolywogRunResult) => void | Promise<void>;
  beforeStage?: (stageName: StageName, payload: unknown) => void | Promise<void>;
  afterStage?: (stageName: StageName, result: unknown) => void | Promise<void>;
  onError?: (stageName: StageName, error: unknown) => void | Promise<void>;
  onWarning?: (warning: string) => void | Promise<void>;
}
