import path from 'node:path';

import ts from 'typescript';

import { getLogger } from '../../helpers';
import type { CommonLogger } from '../../models';

export function getTSConfigCompilerOptions(
  tsconfigFileNameOrPath: string,
  logger: CommonLogger = getLogger(),
): ts.CompilerOptions {
  const tsconfigPath = path.resolve(tsconfigFileNameOrPath);
  if (!tsconfigPath) {
    logger.error('ERROR: Could not find a valid tsconfig.json');
    process.exit(1);
  }

  if (ts.version.match(/^[5-9]\.([4-9]|[1-9]\d)/)) {
    const tsconfigJsonFile = ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
      tsconfigJsonFile,
      ts.sys,
      path.dirname(tsconfigPath),
    );

    logger.groupCollapsed(
      `Parsed tsconfig compiler options for TypeScript >= 5.4 (current version: ${ts.version})`,
    );
    logger.log(parsedConfig.options);
    logger.groupEnd();

    return parsedConfig.options;
  }

  return require(tsconfigPath).compilerOptions;
}
