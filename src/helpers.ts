import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import { FEDERATION_CONFIG_FILE } from './constants';
import { CompileResult, FederationConfig } from './types';

export function assertRunningFromRoot(): void {
  if (!fs.readdirSync('./').includes('node_modules')) {
    console.error('ERROR: Script must be run from the root directory of the project');
    process.exit(1);
  }
}

export function getFederationConfig(customConfigPath?: string): FederationConfig {
  const federationConfigPath = path.resolve(customConfigPath || FEDERATION_CONFIG_FILE);
  if (!federationConfigPath) {
    console.error(`ERROR: Could not find ${FEDERATION_CONFIG_FILE} in project's root directory`);
    process.exit(1);
  }

  const config: FederationConfig = require(federationConfigPath);
  if (!config || !Object.keys(config?.exposes || {}).length) {
    console.error(`ERROR: Invalid ${FEDERATION_CONFIG_FILE}`);
    process.exit(1);
  }

  console.log(`Using config file: ${federationConfigPath}`);

  return config;
}

export function getTSConfigCompilerOptions(): ts.CompilerOptions {
  const tsconfigPath = path.resolve('tsconfig.json');
  if (!tsconfigPath) {
    console.error('ERROR: Could not find a valid tsconfig.json');
    process.exit(1);
  }

  return require(tsconfigPath).compilerOptions;
}

export function reportCompileDiagnostic(diagnostic: ts.Diagnostic): void {
  const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
  console.log('TS Error', diagnostic.code, ':', ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine));
  console.log('         at', `${diagnostic.file!.fileName}:${line + 1}`, '\n');
}

export function compile(exposedComponents: string[], outFile: string): CompileResult {
  const exposedFileNames = Object.values(exposedComponents);
  const { moduleResolution, ...compilerOptions } = getTSConfigCompilerOptions();
  Object.assign(compilerOptions, {
    declaration: true,
    emitDeclarationOnly: true,
    outFile,
  });

  // Create a Program with an in-memory emit to avoid a case when wrong typings are downloaded
  let fileContent: string = '';
  const host = ts.createCompilerHost(compilerOptions);
  host.writeFile = (_fileName: string, contents: string) => fileContent = contents;

  const program = ts.createProgram(exposedFileNames, compilerOptions, host);
  const { diagnostics, emitSkipped } = program.emit();
  diagnostics.forEach(reportCompileDiagnostic);

  return {
    isSuccess: !emitSkipped,
    fileContent,
  };
}

export function rewritePathsWithExposedFederatedModules(
  federationConfig: FederationConfig,
  outFile: string,
  typings: string,
): void {
  const declareRegex = /declare module "(.*)"/g;
  const moduleImportPaths: string[] = [];

  let execResults: null | string[] = [];
  while ((execResults = declareRegex.exec(typings)) !== null) {
    moduleImportPaths.push(execResults[1]);
  }

  let typingsUpdated: string = typings;

  // Support aliases in paths (e.g. @/)
  // Aliases are not included in emitted declarations thus they have to be removed from the exposed path
  const aliasPaths = Object.values(getTSConfigCompilerOptions().paths || {}).map(alias => alias[0]);
  function substituteAliases(modulePath: string): string {
    aliasPaths.forEach(aliasPath => {
      modulePath = modulePath.replace(aliasPath, '');
    });
    return modulePath;
  }

  // Replace and prefix paths by exposed remote names
  moduleImportPaths.forEach((importPath) => {
    const [exposePath, ...aliases] = Object.keys(federationConfig.exposes)
      .filter(key => federationConfig.exposes[key].endsWith(substituteAliases(importPath)))
      .map(key => key.replace(/^\.\//, ''));

    let federatedModulePath = exposePath
      ? `${federationConfig.name}/${exposePath}`
      : `${federationConfig.name}/@types/${importPath}`;

    federatedModulePath = federatedModulePath.replace(/\/index$/, '')

    // language=TypeScript
    const createAliasModule = (modulePath: string) => `
      declare module "${federationConfig.name}/${modulePath}" {
        export * from "${federatedModulePath}"
      }
    `;

    typingsUpdated = [
      typingsUpdated.replace(RegExp(`"${importPath}"`, 'g'), `"${federatedModulePath}"`),
      ...aliases.map(createAliasModule),
    ].join('\n');
  });

  fs.writeFileSync(outFile, typingsUpdated);
}
