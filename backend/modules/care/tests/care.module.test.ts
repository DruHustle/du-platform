import { describe, it, expect } from 'vitest';
import { createCareModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('care module router', () => {
  it('registers health and protected referral routes', () => {
    const routes = getRouteEntries(createCareModuleRouter());
    const healthRoute = findRoute(routes, 'get', '/health');
    const referralRoute = findRoute(routes, 'post', '/referrals');

    expect(healthRoute).toBeDefined();
    expect(referralRoute).toBeDefined();
    expect(referralRoute?.handlerNames.length).toBeGreaterThanOrEqual(4);
  });
});
