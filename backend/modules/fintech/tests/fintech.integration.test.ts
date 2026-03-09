import { describe, it, expect } from 'vitest';
import { createFintechModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('fintech module router', () => {
  it('registers remittance, airtime, and utility endpoints with middleware chains', () => {
    const routes = getRouteEntries(createFintechModuleRouter());

    const quote = findRoute(routes, 'post', '/remittance/quote');
    const send = findRoute(routes, 'post', '/remittance/send');
    const remittanceStatus = findRoute(routes, 'get', '/remittance/:id');
    const detect = findRoute(routes, 'post', '/airtime/operator/detect');
    const options = findRoute(routes, 'post', '/airtime/options');
    const topup = findRoute(routes, 'post', '/airtime/topup');
    const airtimeStatus = findRoute(routes, 'get', '/airtime/:id');
    const electricityOptions = findRoute(routes, "post", "/utility/electricity/options");
    const electricityPay = findRoute(routes, "post", "/utility/electricity/pay");
    const utilityStatus = findRoute(routes, "get", "/utility/:id");

    expect(quote).toBeDefined();
    expect(send).toBeDefined();
    expect(remittanceStatus).toBeDefined();
    expect(detect).toBeDefined();
    expect(options).toBeDefined();
    expect(topup).toBeDefined();
    expect(airtimeStatus).toBeDefined();
    expect(electricityOptions).toBeDefined();
    expect(electricityPay).toBeDefined();
    expect(utilityStatus).toBeDefined();

    expect(send?.handlerNames.length).toBeGreaterThanOrEqual(4);
    expect(topup?.handlerNames.length).toBeGreaterThanOrEqual(4);
    expect(electricityPay?.handlerNames.length).toBeGreaterThanOrEqual(4);
  });
});
