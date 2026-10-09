import { describe, it, expect } from 'vitest';
import { createInvestmentModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('investment module router', () => {
  it('registers GET /ntir/search', () => {
    const routes = getRouteEntries(createInvestmentModuleRouter());
    expect(findRoute(routes, 'get', '/ntir/search')).toBeDefined();
  });
});
