import { getLogger } from '../../helpers';
import type { FederationConfig } from '../../models';

export function includeTypesFromNodeModules(
  federationConfig: FederationConfig,
  typings: string,
): string {
  const logger = getLogger();
  let typingsWithNpmPackages = typings;

  const exposedNpmPackages = Object.entries(federationConfig.exposes)
    .filter(
      ([, packagePath]) =>
        !packagePath.startsWith('.') || packagePath.startsWith('./node_modules/'),
    )
    .map(([exposedModuleKey, exposeTargetPath]) => [
      exposedModuleKey.replace(/^\.\//, ''),
      exposeTargetPath.replace('./node_modules/', ''),
    ]);

  const createNpmModule = (exposedModuleKey: string, packageName: string) =>
    [
      `declare module "${federationConfig.name}/${exposedModuleKey}" {`,
      `  export * from "${packageName}"`,
      '}',
    ].join('\n');

  if (exposedNpmPackages.length) {
    logger.log('Including typings for npm packages:', exposedNpmPackages);
  }

  try {
    exposedNpmPackages.forEach(([exposedModuleKey, packageName]) => {
      typingsWithNpmPackages += `\n${createNpmModule(exposedModuleKey, packageName)}`;
    });
  } catch (err) {
    logger.warn('Typings was not included for npm package:', (err as Dict)?.url);
    logger.log(err);
  }

  return typingsWithNpmPackages;
}
