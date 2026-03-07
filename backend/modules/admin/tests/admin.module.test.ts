import { describe, it, expect } from 'vitest';
import { createAdminModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('admin module router', () => {
  it('registers GET /overview', () => {
    const routes = getRouteEntries(createAdminModuleRouter());
    expect(findRoute(routes, 'get', '/overview')).toBeDefined();
  });
});
