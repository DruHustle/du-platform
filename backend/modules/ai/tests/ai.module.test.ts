import { describe, it, expect } from 'vitest';
import { createAiModuleRouter } from '../routes';
import { findRoute, getMountedRouterCount, getRouteEntries } from '../../tests/routeContract';

describe('ai module router', () => {
  it('registers capabilities and mounts chat/booking/ar/vr routers', () => {
    const router = createAiModuleRouter();
    const routes = getRouteEntries(router);

    expect(findRoute(routes, 'get', '/capabilities')).toBeDefined();
    expect(getMountedRouterCount(router)).toBeGreaterThanOrEqual(4);
  });
});
