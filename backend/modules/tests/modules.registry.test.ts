import { describe, it, expect, vi } from 'vitest';
import { registerDomainModules } from '../index';

describe('domain module registry', () => {
  it('mounts all v2 domain routers under expected base paths', () => {
    const use = vi.fn();
    const app = { use } as any;

    registerDomainModules(app);

    const mountedPaths = use.mock.calls.map((call) => call[0]);

    expect(mountedPaths).toEqual([
      '/api/v2/auth',
      '/api/v2/tourism',
      '/api/v2/trade',
      '/api/v2/investment',
      '/api/v2/care',
      '/api/v2/search',
      '/api/v2/legal',
      '/api/v2/admin',
      '/api/v2/fintech',
      '/api/v2/ai',
      '/api/v2/shop',
    ]);
  });
});
