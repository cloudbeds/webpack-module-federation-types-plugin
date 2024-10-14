import fs from 'node:fs';
import path from 'node:path';

import { mkdirp } from 'mkdirp';

import { PREFIX_NOT_FOR_IMPORT } from '../constants';
import type { CommonLogger, FederationConfig } from '../models';

import { getLogger } from '../helpers';
import { includeTypesFromNodeModules, substituteAliasedModules } from './helpers';

export function rewritePathsWithExposedFederatedModules(
  federationConfig: FederationConfig,
  outFile: string,
  typings: string,
  logger: CommonLogger = getLogger(),
): void {
  const regexDeclareModule = /declare module "(.*)"/g;
  const declaredModulePaths = Array.from(typings.matchAll(regexDeclareModule), match => match[1]);

  logger.debug(`Declared module paths: ${JSON.stringify(declaredModulePaths, null, 2)}`);

  let typingsUpdated: string = typings;

  // Replace and prefix paths by exposed remote names
  declaredModulePaths.forEach(importPath => {
    // Aliases are not included in the emitted declarations hence the need to use `endsWith`
    const [exposedModuleKey, ...exposedModuleNameAliases] = Object.keys(federationConfig.exposes)
      .filter(
        key =>
          federationConfig.exposes[key].endsWith(importPath) ||
          federationConfig.exposes[key].replace(/\.[^./]*$/, '').endsWith(importPath),
      )
      .map(key => key.replace(/^\.\//, ''));

    let federatedModulePath = exposedModuleKey
      ? `${federationConfig.name}/${exposedModuleKey}`
      : `${PREFIX_NOT_FOR_IMPORT}/${federationConfig.name}/${importPath}`;

    federatedModulePath = federatedModulePath.replace(/\/index$/, '');

    // language=TypeScript
    const createAliasModule = (modulePath: string) => `
      declare module "${federationConfig.name}/${modulePath}" {
        export * from "${federatedModulePath}"
      }
    `;

    typingsUpdated = [
      typingsUpdated.replace(RegExp(`"${importPath}"`, 'g'), `"${federatedModulePath}"`),
      ...exposedModuleNameAliases.map(createAliasModule),
    ].join('\n');
  });

  typingsUpdated = substituteAliasedModules(federationConfig.name, typingsUpdated, logger);
  typingsUpdated = includeTypesFromNodeModules(federationConfig, typingsUpdated, logger);

  mkdirp.sync(path.dirname(outFile));
  fs.writeFileSync(outFile, typingsUpdated.replace(/\r\n/g, '\n'));
}
