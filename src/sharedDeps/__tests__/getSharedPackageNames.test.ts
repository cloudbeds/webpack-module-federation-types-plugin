import { describe, expect, test } from 'vitest';

import { getSharedPackageNames } from '../getSharedPackageNames';

describe('getSharedPackageNames', () => {
  test('returns no names when shared is not configured', () => {
    expect(getSharedPackageNames(undefined)).toEqual([]);
  });

  test('reads names from a list of package names', () => {
    expect(getSharedPackageNames(['react', 'react-dom'])).toEqual(['react', 'react-dom']);
  });

  test('reads names from a map of package name to share config', () => {
    expect(
      getSharedPackageNames({
        react: { singleton: true, eager: true },
        '@cloudbeds/ui-library': { singleton: true, requiredVersion: '^2.0.0' },
      }),
    ).toEqual(['react', '@cloudbeds/ui-library']);
  });

  test('reads names from a list mixing names and maps', () => {
    expect(
      getSharedPackageNames(['react', { '@cloudbeds/ui-library': { singleton: true } }]),
    ).toEqual(['react', '@cloudbeds/ui-library']);
  });

  test('leaves out prefix shares, which are not packages', () => {
    expect(getSharedPackageNames({ '@cloudbeds/': { singleton: true }, react: {} })).toEqual([
      'react',
    ]);
  });

  test('lists each package once', () => {
    expect(getSharedPackageNames(['react', { react: { singleton: true } }])).toEqual(['react']);
  });
});
