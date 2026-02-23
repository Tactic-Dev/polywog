import type { IntentEnvelope } from '../types/modules.js';
import { generateId } from '../utils/ids.js';

export function fallbackIntent(message: string): IntentEnvelope {
  return {
    intentId: generateId('intent_fallback'),
    action: 'unknown',
    entities: { originalMessage: message },
    confidence: 0,
  };
}
