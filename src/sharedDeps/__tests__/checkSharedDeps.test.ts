import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { checkSharedDeps, formatSharedDepsMismatch } from '../checkSharedDeps';
import { resolveInstalledVersions } from '../resolveInstalledVersions';
import { writeSharedDepsManifest } from '../writeSharedDepsManifest';

const UI_LIBRARY = '@cloudbeds/ui-library';
const STRICT = [UI_LIBRARY];

let projectDirectory: string;

function installPackage(packageName: string, version: string) {
  const packageDirectory = path.join(projectDirectory, 'node_modules', packageName);
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(packageDirectory, 'package.json'),
    JSON.stringify({ name: packageName, version }),
  );
}

beforeEach(() => {
  projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-deps-'));
});

afterEach(() => {
  fs.rmSync(projectDirectory, { recursive: true, force: true });
});

describe('resolveInstalledVersions', () => {
  test('reads the installed version of each package and skips the ones not installed', () => {
    installPackage(UI_LIBRARY, '2.237.0');
    installPackage('react', '18.3.1');

    expect(
      resolveInstalledVersions([UI_LIBRARY, 'react', 'not-installed'], projectDirectory),
    ).toEqual({ [UI_LIBRARY]: '2.237.0', react: '18.3.1' });
  });
});

describe('writeSharedDepsManifest', () => {
  test('writes shared-deps.json with the installed version of each shared package', () => {
    installPackage(UI_LIBRARY, '2.237.0');
    installPackage('react', '18.3.1');
    const dirEmittedTypes = path.join(projectDirectory, 'dist', '@types');

    const manifest = writeSharedDepsManifest(
      { [UI_LIBRARY]: { singleton: true }, react: { singleton: true }, 'not-installed': {} },
      dirEmittedTypes,
      projectDirectory,
    );

    expect(manifest).toEqual({ [UI_LIBRARY]: '2.237.0', react: '18.3.1' });
    expect(
      JSON.parse(fs.readFileSync(path.join(dirEmittedTypes, 'shared-deps.json'), 'utf8')),
    ).toEqual(manifest);
  });
});

describe('checkSharedDeps', () => {
  test('reports nothing when every version matches', () => {
    installPackage(UI_LIBRARY, '2.237.0');
    installPackage('react', '18.3.1');

    expect(
      checkSharedDeps(
        'mfdCommon',
        { [UI_LIBRARY]: '2.237.0', react: '18.3.1' },
        STRICT,
        projectDirectory,
      ),
    ).toEqual([]);
  });

  test('fails a strict package when the producer is newer than the consumer', () => {
    installPackage(UI_LIBRARY, '2.223.4');

    expect(
      checkSharedDeps('mfdCommon', { [UI_LIBRARY]: '2.237.0' }, STRICT, projectDirectory),
    ).toEqual([
      {
        remoteName: 'mfdCommon',
        packageName: UI_LIBRARY,
        producerVersion: '2.237.0',
        consumerVersion: '2.223.4',
        strict: true,
      },
    ]);
  });

  test('fails a strict package when the consumer is newer than the producer', () => {
    installPackage(UI_LIBRARY, '2.237.0');

    expect(
      checkSharedDeps('mfdCommon', { [UI_LIBRARY]: '2.223.4' }, STRICT, projectDirectory),
    ).toEqual([
      expect.objectContaining({
        producerVersion: '2.223.4',
        consumerVersion: '2.237.0',
        strict: true,
      }),
    ]);
  });

  test('only warns for a package outside the strict list', () => {
    installPackage('react', '18.2.0');

    expect(checkSharedDeps('mfdCommon', { react: '18.3.1' }, STRICT, projectDirectory)).toEqual([
      {
        remoteName: 'mfdCommon',
        packageName: 'react',
        producerVersion: '18.3.1',
        consumerVersion: '18.2.0',
        strict: false,
      },
    ]);
  });

  test('skips packages the consumer does not have installed', () => {
    expect(
      checkSharedDeps('mfdCommon', { [UI_LIBRARY]: '2.237.0' }, STRICT, projectDirectory),
    ).toEqual([]);
  });
});

describe('formatSharedDepsMismatch', () => {
  test('names the remote, the package, both versions and the remedy', () => {
    expect(
      formatSharedDepsMismatch({
        remoteName: 'mfdCommon',
        packageName: UI_LIBRARY,
        producerVersion: '2.237.0',
        consumerVersion: '2.223.4',
        strict: true,
      }),
    ).toBe(
      'mfdCommon built its types with @cloudbeds/ui-library 2.237.0; this repo resolves 2.223.4. ' +
        'Install 2.237.0 here, or rebuild mfdCommon types with 2.223.4.',
    );
  });
});
