import type { SharedDepsManifest, SharedDepsMismatch } from '../models';

import { resolveInstalledVersions } from './resolveInstalledVersions';

/**
 * Compares the versions a remote compiled its types with against the versions installed here.
 * Both directions of skew are reported: a newer producer widens types the consumer's library
 * does not accept, and a newer consumer passes values a producer parameter does not accept.
 * Packages not installed here are skipped.
 */
export function checkSharedDeps(
  remoteName: string,
  producerManifest: SharedDepsManifest,
  strictPackages: string[],
  projectDirectory?: string,
): SharedDepsMismatch[] {
  const consumerVersions = resolveInstalledVersions(
    Object.keys(producerManifest),
    projectDirectory,
  );

  return Object.entries(producerManifest).flatMap(([packageName, producerVersion]) => {
    const consumerVersion = consumerVersions[packageName];

    if (!consumerVersion || consumerVersion === producerVersion) {
      return [];
    }

    return [
      {
        remoteName,
        packageName,
        producerVersion,
        consumerVersion,
        strict: strictPackages.includes(packageName),
      },
    ];
  });
}

export function formatSharedDepsMismatch({
  remoteName,
  packageName,
  producerVersion,
  consumerVersion,
}: SharedDepsMismatch): string {
  return (
    `${remoteName} built its types with ${packageName} ${producerVersion}; ` +
    `this repo resolves ${consumerVersion}. ` +
    `Install ${producerVersion} here, or rebuild ${remoteName} types with ${consumerVersion}.`
  );
}
