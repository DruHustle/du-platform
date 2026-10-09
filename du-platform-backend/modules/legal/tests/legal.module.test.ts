import { describe, it, expect } from 'vitest';
import { createLegalModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('legal module router', () => {
  it('registers GET /health', () => {
    const routes = getRouteEntries(createLegalModuleRouter());
    expect(findRoute(routes, 'get', '/health')).toBeDefined();
  });
});
