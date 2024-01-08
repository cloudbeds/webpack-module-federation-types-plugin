import ts from 'typescript';

import { getLogger } from '../../helpers';

export function reportCompileDiagnostic(diagnostic: ts.Diagnostic): void {
  const logger = getLogger();
  const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
  logger.log('TS Error', diagnostic.code, ':', ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine));
  logger.log('         at', `${diagnostic.file!.fileName}:${line + 1}`, '\n');
}
