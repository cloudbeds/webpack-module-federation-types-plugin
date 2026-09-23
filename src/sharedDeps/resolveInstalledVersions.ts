import fs from 'node:fs';
import path from 'node:path';

import type { SharedDepsManifest } from '../models';

/**
 * Installed version of each package, read from `node_modules/<name>/package.json`.
 * Packages that are not installed are left out.
 */
export function resolveInstalledVersions(
  packageNames: string[],
  projectDirectory = process.cwd(),
): SharedDepsManifest {
  return packageNames.reduce<SharedDepsManifest>((versions, packageName) => {
    const packageJsonPath = path.join(
      projectDirectory,
      'node_modules',
      packageName,
      'package.json',
    );

    if (fs.existsSync(packageJsonPath)) {
      const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        version?: string;
      };
      if (version) {
        versions[packageName] = version;
      }
    }

    return versions;
  }, {});
}
