import path from 'path';

import ts from 'typescript';

import { getLogger } from '../../helpers';

export function getTSConfigCompilerOptions(tsconfigFileNameOrPath: string): ts.CompilerOptions {
  const logger = getLogger();

  const tsconfigPath = path.resolve(tsconfigFileNameOrPath);
  if (!tsconfigPath) {
    logger.error('ERROR: Could not find a valid tsconfig.json');
    process.exit(1);
  }

  return require(tsconfigPath).compilerOptions;
}
