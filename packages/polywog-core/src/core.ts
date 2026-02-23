import type { PolywogRunInput } from './types/run-input.js';
import type { PolywogRunResult } from './types/run-result.js';
import type { PolywogCoreConfig } from './types/config.js';
import { runPipeline } from './lifecycle/run-pipeline.js';

export class PolywogCore {
  private readonly config: PolywogCoreConfig;

  constructor(config: PolywogCoreConfig) {
    this.config = config;
  }

  async run(input: PolywogRunInput): Promise<PolywogRunResult> {
    return runPipeline(input, this.config);
  }
}
