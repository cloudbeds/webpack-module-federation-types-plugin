import { describe, expect, test } from 'vitest';

import { resolveRemoteDtsUrl } from '../resolveRemoteDtsUrl';

const dirEmittedTypes = 'dist/@types';

describe('resolveRemoteDtsUrl', () => {
  test('drops the filename when the resolved entry URL points at remoteEntry.js', () => {
    const url = resolveRemoteDtsUrl(
      'mfdApp1',
      'mfdApp1@[mfdApp1Url]/remoteEntry.js',
      { mfdApp1: 'https://app1.example.com/remoteEntry.js' },
      dirEmittedTypes,
    );

    expect(url).toBe(`https://app1.example.com/${dirEmittedTypes}/index.d.ts`);
  });

  test('treats a resolved entry URL with no filename as the base URL', () => {
    const url = resolveRemoteDtsUrl(
      'mfdApp1',
      'mfdApp1@[mfdApp1Url]/remoteEntry.js',
      { mfdApp1: 'https://app1.example.com/branches/dev' },
      dirEmittedTypes,
    );

    expect(url).toBe(`https://app1.example.com/branches/dev/${dirEmittedTypes}/index.d.ts`);
  });

  test('falls back to the URL half of the federation config entry', () => {
    const url = resolveRemoteDtsUrl(
      'mfdApp1',
      'mfdApp1@https://fallback.example.com/remoteEntry.js',
      {},
      dirEmittedTypes,
    );

    expect(url).toBe(`https://fallback.example.com/${dirEmittedTypes}/index.d.ts`);
  });

  test('prefers the resolved entry URL over the federation config entry', () => {
    const url = resolveRemoteDtsUrl(
      'mfdApp1',
      'mfdApp1@https://fallback.example.com/remoteEntry.js',
      { mfdApp1: 'https://resolved.example.com/remoteEntry.js' },
      dirEmittedTypes,
    );

    expect(url).toBe(`https://resolved.example.com/${dirEmittedTypes}/index.d.ts`);
  });

  test('throws a reportable message when the entry carries no URL half', () => {
    expect(() => resolveRemoteDtsUrl('mfdApp1', 'mfdApp1', {}, dirEmittedTypes)).toThrow(
      "'mfdApp1' carries no @<url> half, and no remote entry URL is known",
    );
  });
});
