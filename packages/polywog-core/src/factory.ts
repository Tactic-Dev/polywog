import type { PolywogCoreConfig } from './types/config.js';
import { PolywogCore } from './core.js';

export function createPolywogCore(config: PolywogCoreConfig): PolywogCore {
  validateModules(config);
  return new PolywogCore(config);
}

function validateModules(config: PolywogCoreConfig): void {
  const required = ['interpreter', 'router', 'weave', 'executor', 'format'] as const;
  for (const mod of required) {
    if (!config.modules[mod]) {
      throw new Error(`PolywogCoreConfig is missing required module: ${mod}`);
    }
  }
}
