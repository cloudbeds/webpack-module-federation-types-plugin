import path from 'path';
import fs from 'fs';

import mkdirp from 'mkdirp';

import { FederationConfig } from '../models';

import { includeTypesFromNodeModules } from './helpers';

export function rewritePathsWithExposedFederatedModules(
  federationConfig: FederationConfig,
  outFile: string,
  typings: string,
): void {
  const regexDeclareModule = /declare module "(.*)"/g;
  const declaredModulePaths: string[] = [];

  // Collect all instances of `declare module "..."`
  for (
    let execResults: null | string[] = regexDeclareModule.exec(typings);
    execResults !== null;
    execResults = regexDeclareModule.exec(typings)
  ) {
    declaredModulePaths.push(execResults[1]);
  }

  let typingsUpdated: string = typings;

  // Replace and prefix paths by exposed remote names
  declaredModulePaths.forEach(importPath => {
    // Aliases are not included in the emitted declarations hence the need to use `endsWith`
    const [exposedModuleKey, ...exposedModuleNameAliases] = Object.keys(federationConfig.exposes)
      .filter(key => (
        federationConfig.exposes[key].endsWith(importPath)
        || federationConfig.exposes[key].replace(/\.[^./]*$/, '').endsWith(importPath)
      ))
      .map(key => key.replace(/^\.\//, ''));

    let federatedModulePath = exposedModuleKey
      ? `${federationConfig.name}/${exposedModuleKey}`
      : `#not-for-import/${federationConfig.name}/${importPath}`;

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

  typingsUpdated = includeTypesFromNodeModules(federationConfig, typingsUpdated);

  mkdirp.sync(path.dirname(outFile));
  fs.writeFileSync(outFile, typingsUpdated.replace(/\r\n/g, '\n'));
}
