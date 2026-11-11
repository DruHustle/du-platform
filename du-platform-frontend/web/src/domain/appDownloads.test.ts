import { test, expect } from 'vitest';
import { downloadStatus, publicDownloadUrl } from './appDownloads';

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

test('direct Android downloads require a versioned file, first-party source and verified digest', () => {
  const digest = 'a'.repeat(64);
  expect(downloadStatus(undefined)).toBe('unavailable');
  expect(downloadStatus('https://play.google.com/store/apps/details')).toBe('play');
  const firstParty = 'https://www.diasporaunlocked.com/downloads/diaspora-unlocked-1.0.0.apk';
  const release = 'https://github.com/DruHustle/du-platform/releases/download/mobile-v1.0.0/diaspora-unlocked-1.0.0.apk';
  for (const url of [firstParty, release]) {
    expect(publicDownloadUrl('android', url, digest)).toBe(url);
    expect(downloadStatus(url)).toBe('apk');
    expect(publicDownloadUrl('android', url)).toBeUndefined();
    expect(publicDownloadUrl('android', url, 'unverified')).toBeUndefined();
    expect(publicDownloadUrl('ios', url, digest)).toBeUndefined();
  }
  for (const url of [firstParty.replace('www.diasporaunlocked.com', 'unrelated.example'),
    release.replace('/DruHustle/', '/untrusted/'), release.replace('/du-platform/', '/other-repo/'),
    release.replace('/download/', '/edit/'), firstParty.replace('-1.0.0.apk', '-debug.apk'),
    firstParty + '?redirect=other', firstParty.replace('/downloads/', '/uploads/')]) {
    expect(publicDownloadUrl('android', url, digest)).toBeUndefined();
  }
});
