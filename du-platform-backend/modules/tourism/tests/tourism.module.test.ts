import { describe, it, expect } from 'vitest';
import { createTourismModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('tourism module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createTourismModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
