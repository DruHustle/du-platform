import { describe, it, expect } from 'vitest';
import { createAdminModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('admin module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createAdminModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
