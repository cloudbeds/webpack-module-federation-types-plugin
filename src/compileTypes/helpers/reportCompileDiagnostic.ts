import ts from 'typescript';

import { getLogger } from '../../helpers';
import type { CommonLogger } from '../../models';

const CONTEXT_LINES = 3;

export function reportCompileDiagnostic(
  diagnostic: ts.Diagnostic,
  logger: CommonLogger = getLogger(),
): void {
  const message = [
    `TS Error ${diagnostic.code}:`,
    ts.flattenDiagnosticMessageText(diagnostic.messageText, ts.sys.newLine),
  ].join(' ');

  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const sourceCode = diagnostic.file.text;
    const lines = sourceCode.split('\n');

    const startLine = Math.max(0, line - CONTEXT_LINES);
    const endLine = Math.min(lines.length - 1, line + CONTEXT_LINES);

    logger.error(message);
    logger.error(`  at ${diagnostic.file.fileName}:${line + 1}:${character + 1}`);

    for (let i = startLine; i <= endLine; i++) {
      const prefix = i === line ? '> ' : '  ';
      logger.error(`${prefix}${i + 1} | ${lines[i]}`);

      if (i === line) {
        const caretPosition = prefix.length + (i + 1).toString().length + 3 + character;
        logger.error(`${' '.repeat(caretPosition)}^`);
      }
    }
  } else {
    logger.error(message);
  }
}
