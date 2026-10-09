import { describe, it, expect } from 'vitest';
import { createFintechModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('fintech module router', () => {
  it('registers remittance and airtime endpoints with middleware chains', () => {
    const routes = getRouteEntries(createFintechModuleRouter());

    const config = findRoute(routes, 'get', '/remittance/config');
    const quote = findRoute(routes, 'post', '/remittance/quote');
    const send = findRoute(routes, 'post', '/remittance/send');
    const remittanceList = findRoute(routes, 'get', '/remittance');
    const remittanceStatus = findRoute(routes, 'get', '/remittance/:id');
    const detect = findRoute(routes, 'post', '/airtime/operator/detect');
    const options = findRoute(routes, 'post', '/airtime/options');
    const topup = findRoute(routes, 'post', '/airtime/topup');
    const airtimeList = findRoute(routes, 'get', '/airtime');
    const airtimeStatus = findRoute(routes, 'get', '/airtime/:id');
    const giftCardsCatalogue = findRoute(routes, 'get', '/gift-cards/catalog');

    expect(config).toBeDefined();
    expect(quote).toBeDefined();
    expect(send).toBeDefined();
    expect(remittanceList).toBeDefined();
    expect(remittanceStatus).toBeDefined();
    expect(detect).toBeDefined();
    expect(options).toBeDefined();
    expect(topup).toBeDefined();
    expect(airtimeList).toBeDefined();
    expect(airtimeStatus).toBeDefined();
    expect(giftCardsCatalogue).toBeDefined();

    expect(send?.handlerNames.length).toBeGreaterThanOrEqual(4);
    expect(topup?.handlerNames.length).toBeGreaterThanOrEqual(4);
  });
});
