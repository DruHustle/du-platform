import { describe, it, expect } from 'vitest';
import { createAiModuleRouter } from '../routes';
import { findRoute, getMountedRouterCount, getRouteEntries } from '../../tests/routeContract';

describe('ai module router', () => {
  it('registers capabilities, Onesa AI endpoints, and mounts ar/vr routers', () => {
    const router = createAiModuleRouter();
    const routes = getRouteEntries(router);

    expect(findRoute(routes, 'get', '/capabilities')).toBeDefined();
    expect(findRoute(routes, 'post', '/chat')).toBeDefined();
    expect(findRoute(routes, 'post', '/trip-plan')).toBeDefined();
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
    expect(findRoute(routes, 'get', '/ready')).toBeDefined();
    expect(findRoute(routes, 'post', '/generate-world')).toBeDefined();
    expect(getMountedRouterCount(router)).toBeGreaterThanOrEqual(2);
  });
});
