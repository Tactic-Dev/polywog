import type { RoutePlan } from '../types/modules.js';
import { generateId } from '../utils/ids.js';

export function fallbackRoute(): RoutePlan {
  return {
    routePlanId: generateId('route_fallback'),
    strategy: 'general_llm',
    spokes: [
      {
        spokeId: 'general_llm',
        priority: 1,
      },
    ],
  };
}
