import type { RouterModule, RouterInput, RoutePlan } from '@polywog/core';
import { mapCoreInputToPkgRouterInput, mapPkgRoutePlanToCore, type PkgRoutePlan } from '../mappers/route.js';

/**
 * Loose contract for what we accept as the real router instance.
 * Matches `PolywogRouter` from @polywog/router without importing it.
 */
export interface RealRouter {
  route(input: unknown): unknown;
}

/**
 * Wraps a real PolywogRouter to conform to Core's RouterModule contract.
 *
 * - `route()` → `plan()` rename
 * - Sync → async
 * - Maps `intent` → `intentEnvelope` (reconstructs Router's expected shape)
 * - Maps `preferences` → `routingPreferences`
 * - Maps output: `id` → `routePlanId`, `executionMode` → `strategy`, etc.
 * - Stores original output in `raw` for downstream adapters
 */
export class RouterAdapter implements RouterModule {
  private readonly real: RealRouter;

  constructor(router: RealRouter) {
    this.real = router;
  }

  async plan(input: RouterInput): Promise<RoutePlan> {
    const pkgInput = mapCoreInputToPkgRouterInput(input);
    const result = this.real.route(pkgInput) as PkgRoutePlan;
    return mapPkgRoutePlanToCore(result);
  }
}
