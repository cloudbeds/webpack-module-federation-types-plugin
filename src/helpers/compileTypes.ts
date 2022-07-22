import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import ts from 'typescript';

import { getLogger } from './logger';

import { CompileTypesResult, FederationConfig } from '../types';

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

export function compileTypes(exposedComponents: string[], outFile: string): CompileTypesResult {
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

  exposedFileNames.push('./src/@types/utility.d.ts');
  const program = ts.createProgram(exposedFileNames, compilerOptions, host);
  const { diagnostics, emitSkipped } = program.emit();
  diagnostics.forEach(reportCompileDiagnostic);

  return {
    isSuccess: !emitSkipped,
    typeDefinitions: fileContent,
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
      : `@remote-types/${federationConfig.name}/${importPath}`;

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

  mkdirp.sync(path.dirname(outFile));
  fs.writeFileSync(outFile, typingsUpdated.replace(/\r\n/g, '\n'));
}
