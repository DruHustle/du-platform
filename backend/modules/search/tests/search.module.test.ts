import { describe, it, expect } from 'vitest';
import { createSearchModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('search module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createSearchModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
