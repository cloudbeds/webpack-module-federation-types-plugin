import fs from 'node:fs';

import ts from 'typescript';

import { getAllFilePaths, getLogger } from '../helpers';

import type { CommonLogger } from '../models/CommonLogger';
import { getTSConfigCompilerOptions, reportCompileDiagnostic } from './helpers';

export type CompileTypesParams = {
  tsconfigPath: string;
  exposedModules: string[];
  outFile: string;
  dirGlobalTypes: string;
};

export type CompileTypesResult = {
  isSuccess: boolean;
  typeDefinitions: string;
};

export function compileTypes(
  { tsconfigPath, exposedModules, outFile, dirGlobalTypes }: CompileTypesParams,
  logger: CommonLogger = getLogger(),
): CompileTypesResult {
  const exposedFileNames = Object.values(exposedModules);
  const { moduleResolution, ...compilerOptions } = getTSConfigCompilerOptions(tsconfigPath, logger);

  Object.assign(compilerOptions, {
    declaration: true,
    emitDeclarationOnly: true,
    noEmit: false,
    outFile,
  } as ts.CompilerOptions);

  // Expand lib name to a file name according to https://stackoverflow.com/a/69617124/1949503
  if (compilerOptions.lib) {
    compilerOptions.lib = compilerOptions.lib.map(fileName =>
      (fileName.includes('.d.ts') ? fileName : `lib.${fileName}.d.ts`).toLowerCase(),
    );
  }

  // Create a Program with an in-memory emit to avoid a case when wrong typings are downloaded
  let fileContent = '';
  const host = ts.createCompilerHost(compilerOptions);
  host.writeFile = (_fileName: string, contents: string) => {
    fileContent = contents;
    return contents;
  };

  // Including global type definitions from `src/@types` directory
  if (fs.existsSync(dirGlobalTypes)) {
    exposedFileNames.push(
      ...getAllFilePaths(`./${dirGlobalTypes}`).filter(filePath => filePath.endsWith('.d.ts')),
    );
  }
  logger.log('[compileTypes]: Including a set of root files in compilation');
  logger.log(JSON.stringify(exposedFileNames, null, 2));

  const program = ts.createProgram(exposedFileNames, compilerOptions, host);
  const { diagnostics, emitSkipped } = program.emit();
  diagnostics.forEach(item => reportCompileDiagnostic(item, logger));

  if (emitSkipped) {
    logger.log('[compileTypes]: TypeScript program emit skipped');
  }

  return {
    isSuccess: !emitSkipped,
    typeDefinitions: fileContent,
  };
}
