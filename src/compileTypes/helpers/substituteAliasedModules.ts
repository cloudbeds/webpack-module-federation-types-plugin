import { getLogger } from '../../helpers';
import { PREFIX_NOT_FOR_IMPORT } from '../../constants';

export function substituteAliasedModules(federatedModuleName: string, typings: string): string {
  const logger = getLogger();

  // Collect all instances of `import("...")`
  const regexImportPaths = /import\("([^"]*)"\)/g;
  const uniqueImportPaths = new Set();

  let match = regexImportPaths.exec(typings);
  while (match) {
    uniqueImportPaths.add(match[1]);
    match = regexImportPaths.exec(typings);
  }

  uniqueImportPaths.forEach(importPath => {
    const notForImportPath = `${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${importPath}`;

    if (typings.includes(`declare module "${notForImportPath}"`)) {
      logger.log(`Substituting import path: ${importPath}`);

      typings = typings.replace(
        new RegExp(`import\\("${importPath}"\\)`, 'g'),
        `import("${notForImportPath}")`,
      );
    }
  });

  return typings;
}
