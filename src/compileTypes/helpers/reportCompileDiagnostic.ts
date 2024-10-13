import ts from 'typescript';

import { getLogger } from '../../helpers';
import type { CommonLogger } from '../../models';

export function reportCompileDiagnostic(
  diagnostic: ts.Diagnostic,
  logger: CommonLogger = getLogger(),
): void {
  const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
  logger.log(
    `TS Error ${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine)}`,
  );
  logger.log(`         at ${diagnostic.file!.fileName}:${line + 1}`);
}
