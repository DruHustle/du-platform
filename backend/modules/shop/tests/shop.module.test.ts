import { describe, it, expect } from 'vitest';
import { createShopModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('shop module router', () => {
  it('registers product and order routes', () => {
    const routes = getRouteEntries(createShopModuleRouter());

    expect(findRoute(routes, 'get', '/products')).toBeDefined();
    expect(findRoute(routes, 'post', '/orders')).toBeDefined();
    expect(findRoute(routes, 'get', '/orders/:orderRef')).toBeDefined();
    expect(findRoute(routes, 'post', '/orders/:orderRef/confirm-payment')).toBeDefined();
  });
});
