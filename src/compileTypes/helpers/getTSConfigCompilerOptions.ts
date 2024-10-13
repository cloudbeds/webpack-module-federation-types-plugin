import path from 'node:path';

import type ts from 'typescript';

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

  const tsconfigJsonFile = ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
    tsconfigJsonFile,
    ts.sys,
    path.dirname(tsconfigPath),
  );

  return parsedConfig.options;
}
