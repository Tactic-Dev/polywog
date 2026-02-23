import type { ContextBundle } from '../types/modules.js';
import { generateId } from '../utils/ids.js';

export function fallbackContext(constraints?: string[], sessionSummary?: string): ContextBundle {
  return {
    contextId: generateId('ctx_fallback'),
    entries: [],
    constraints: constraints ?? [],
    sessionSummary: sessionSummary ?? '',
  };
}
