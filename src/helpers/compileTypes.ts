import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import ts from 'typescript';

import { getLogger } from './logger';

import { CompileTypesResult, FederationConfig } from '../types';
import { getAllFilePaths } from './files';

export function getTSConfigCompilerOptions(): ts.CompilerOptions {
  const logger = getLogger();
  const tsconfigPath = path.resolve('tsconfig.json');
  if (!tsconfigPath) {
    logger.error('ERROR: Could not find a valid tsconfig.json');
    process.exit(1);
  }

  return require(tsconfigPath).compilerOptions;
}

export function reportCompileDiagnostic(diagnostic: ts.Diagnostic): void {
  const logger = getLogger();
  const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
  logger.log('TS Error', diagnostic.code, ':', ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine));
  logger.log('         at', `${diagnostic.file!.fileName}:${line + 1}`, '\n');
}

export function compileTypes(exposedComponents: string[], outFile: string, dirGlobalTypes: string): CompileTypesResult {
  const logger = getLogger();

  const exposedFileNames = Object.values(exposedComponents);
  const { moduleResolution, ...compilerOptions } = getTSConfigCompilerOptions();

  Object.assign(compilerOptions, {
    declaration: true,
    emitDeclarationOnly: true,
    noEmit: false,
    outFile,
  } as ts.CompilerOptions);

  // Expand lib name to a file name according to https://stackoverflow.com/a/69617124/1949503
  if (compilerOptions.lib) {
    compilerOptions.lib = compilerOptions.lib.map(
      fileName => (fileName.includes('.d.ts') ? fileName : `lib.${fileName}.d.ts`).toLowerCase(),
    );
  }

  // Create a Program with an in-memory emit to avoid a case when wrong typings are downloaded
  let fileContent: string = '';
  const host = ts.createCompilerHost(compilerOptions);
  host.writeFile = (_fileName: string, contents: string) => fileContent = contents;

  // Including global type definitions from `src/@types` directory
  if (fs.existsSync(dirGlobalTypes)) {
    exposedFileNames.push(...getAllFilePaths(`./${dirGlobalTypes}`).filter(path => path.endsWith('.d.ts')));
  }
  logger.log('Including a set of root files in compilation', exposedFileNames);

  const program = ts.createProgram(exposedFileNames, compilerOptions, host);
  const { diagnostics, emitSkipped } = program.emit();
  diagnostics.forEach(reportCompileDiagnostic);

  return {
    isSuccess: !emitSkipped,
    typeDefinitions: fileContent,
  };
}

export function includeTypesFromNodeModules(federationConfig: FederationConfig, typings: string): string {
  const logger = getLogger();
  let typingsWithNpmPackages = typings;

  const exposedNpmPackages = Object.entries(federationConfig.exposes)
    .filter(([, path]) => !path.startsWith('.') || path.startsWith('./node_modules/'))
    .map(([exposedModuleKey, exposeTargetPath]) => [
      exposedModuleKey.replace(/^\.\//, ''),
      exposeTargetPath.replace('./node_modules/', ''),
    ]);

  // language=TypeScript
  const createNpmModule = (exposedModuleKey: string, packageName: string) => `
    declare module "${federationConfig.name}/${exposedModuleKey}" {
      export * from "${packageName}"
    }
  `;

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

export function rewritePathsWithExposedFederatedModules(
  federationConfig: FederationConfig,
  outFile: string,
  typings: string,
): void {
  const regexDeclareModule = /declare module "(.*)"/g;
  const declaredModulePaths: string[] = [];

  // Collect all instances of `declare module "..."`
  let execResults: null | string[] = [];
  while ((execResults = regexDeclareModule.exec(typings)) !== null) {
    declaredModulePaths.push(execResults[1]);
  }

  let typingsUpdated: string = typings;

  // Replace and prefix paths by exposed remote names
  declaredModulePaths.forEach((importPath) => {
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

    federatedModulePath = federatedModulePath.replace(/\/index$/, '')

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
