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
    logger.log('Including typings for npm packages:');
    logger.log(JSON.stringify(exposedNpmPackages, null, 2));
  }

  try {
    exposedNpmPackages.forEach(([exposedModuleKey, packageName]) => {
      typingsWithNpmPackages += `\n${createNpmModule(exposedModuleKey, packageName)}`;
    });
  } catch (err) {
    logger.warn(`Typings was not included for npm package: ${(err as Dict)?.url}`);
    logger.log(JSON.stringify(err, null, 2));
  }

  return typingsWithNpmPackages;
}
