import { describe, it, expect } from 'vitest';
import { createInvestmentModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('investment module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createInvestmentModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
