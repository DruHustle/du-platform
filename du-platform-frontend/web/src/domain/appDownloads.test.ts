import { test, expect } from 'vitest';
import { publicDownloadUrl } from './appDownloads';

test('only public release destinations for the selected platform become download links', () => {
  expect(publicDownloadUrl('ios', undefined)).toBeUndefined();
  expect(publicDownloadUrl('android', '')).toBeUndefined();
  const android = 'https://play.google.com/store/apps/details?id=com.diasporaunlocked.app';
  const apple = 'https://apps.apple.com/zw/app/example/id123456789';
  const beta = 'https://testflight.apple.com/join/Ab12Cd34';
  expect(publicDownloadUrl('android', android)).toBe(android);
  expect(publicDownloadUrl('ios', apple)).toBe(apple);
  expect(publicDownloadUrl('ios', beta)).toBe(beta);
  for (const url of [apple.replace('apps.apple.com', 'example.com'), 'javascript:alert(1)',
    'https://example.com/app.apk', apple.replace('https:', 'http:'), apple + '?redirect=example.com',
    apple.replace('apps.apple.com', 'name:pass@apps.apple.com'), beta + '/extra']) {
    expect(publicDownloadUrl('ios', url)).toBeUndefined();
  }
  expect(publicDownloadUrl('android', android + '.different')).toBeUndefined();
  expect(publicDownloadUrl('android', beta)).toBeUndefined();
});
