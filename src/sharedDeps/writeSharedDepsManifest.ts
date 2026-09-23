import fs from 'node:fs';
import path from 'node:path';

import { SHARED_DEPS_FILE } from '../constants';
import type { FederationConfig, SharedDepsManifest } from '../models';

import { getSharedPackageNames } from './getSharedPackageNames';
import { resolveInstalledVersions } from './resolveInstalledVersions';

/**
 * Writes `shared-deps.json` next to the emitted `index.d.ts`, so consumers can tell which
 * versions of the shared packages the declarations were compiled against.
 */
export function writeSharedDepsManifest(
  shared: FederationConfig['shared'],
  dirEmittedTypes: string,
  projectDirectory?: string,
): SharedDepsManifest {
  const manifest = resolveInstalledVersions(getSharedPackageNames(shared), projectDirectory);

  fs.mkdirSync(dirEmittedTypes, { recursive: true });
  fs.writeFileSync(
    path.join(dirEmittedTypes, SHARED_DEPS_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return manifest;
}
