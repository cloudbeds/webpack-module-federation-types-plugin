import { getLogger } from '../../helpers';
import type { CommonLogger, FederationConfig } from '../../models';

export function includeTypesFromNodeModules(
  federationConfig: FederationConfig,
  typings: string,
  logger: CommonLogger = getLogger(),
): string {
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
    if (exposedNpmPackages.length === 1) {
      logger.log('Including typings for npm package', exposedNpmPackages[0]);
    } else {
      logger.groupCollapsed(
        'Including typings for npm packages',
        `(${exposedNpmPackages.length} packages)`,
      );
      logger.log(exposedNpmPackages);
      logger.groupEnd();
    }
  }

  try {
    exposedNpmPackages.forEach(([exposedModuleKey, packageName]) => {
      typingsWithNpmPackages += `\n${createNpmModule(exposedModuleKey, packageName)}`;
    });
  } catch (err) {
    const url = (err as Dict)?.url;
    if (url) {
      logger.warn(`Typings were not included for npm package: ${url}`);
    }
    logger.log(err);
  }

  return typingsWithNpmPackages;
}
