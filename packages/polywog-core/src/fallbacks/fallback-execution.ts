import type { ExecutionResult } from '../types/modules.js';
import { generateId } from '../utils/ids.js';

export function fallbackExecution(errorMessage: string): ExecutionResult {
  return {
    executionId: generateId('exec_fallback'),
    status: 'failed',
    output: null,
    spokeResults: [],
    warnings: [],
    errors: [errorMessage],
  };
}
