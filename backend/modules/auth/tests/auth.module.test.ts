import { describe, it, expect } from 'vitest';
import { createAuthModuleRouter } from '../routes';
import { findRoute, getRouteEntries } from '../../tests/routeContract';

describe('auth module router', () => {
  it('registers POST /register with validation and controller handlers', () => {
    const routes = getRouteEntries(createAuthModuleRouter());
    const registerRoute = findRoute(routes, 'post', '/register');

    expect(registerRoute).toBeDefined();
    expect(registerRoute?.handlerNames.length).toBeGreaterThanOrEqual(2);
  });
});
