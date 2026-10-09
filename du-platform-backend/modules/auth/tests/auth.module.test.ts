import { describe, it, expect } from 'vitest';
import { createAuthModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('auth module router', () => {
  it('registers the core auth routes with middleware chains', () => {
    const routes = getRouteEntries(createAuthModuleRouter());
    const registerRoute = findRoute(routes, 'post', '/register');
    const meRoute = findRoute(routes, 'get', '/me');
    const refreshRoute = findRoute(routes, 'post', '/token/refresh');
    const providerDecisionRoute = findRoute(routes, 'post', '/kyc/provider/decision');

    expect(registerRoute).toBeDefined();
    expect(meRoute).toBeDefined();
    expect(refreshRoute).toBeDefined();
    expect(providerDecisionRoute).toBeDefined();

    expect(registerRoute?.handlerNames.length).toBeGreaterThanOrEqual(3);
    expect(meRoute?.handlerNames.length).toBeGreaterThanOrEqual(3);
    expect(providerDecisionRoute?.handlerNames.length).toBeGreaterThanOrEqual(3);
  });
});
