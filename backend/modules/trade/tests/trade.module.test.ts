import { describe, it, expect } from 'vitest';
import { createTradeModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('trade module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createTradeModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
