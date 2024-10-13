import { PREFIX_NOT_FOR_IMPORT } from '../../constants';
import { getLogger } from '../../helpers';

export function substituteAliasedModules(federatedModuleName: string, typings: string): string {
  const logger = getLogger();

  // Collect all instances of `import("...")`
  const regexImportPaths = /import\("([^"]*)"\)/g;
  const uniqueImportPaths = new Set<string>();

  let match = regexImportPaths.exec(typings);
  while (match) {
    uniqueImportPaths.add(match[1]);
    match = regexImportPaths.exec(typings);
  }

  let modifiedTypings = typings;

  uniqueImportPaths.forEach(importPath => {
    const notForImportPath = `${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${importPath}`;

    if (modifiedTypings.includes(`declare module "${notForImportPath}"`)) {
      logger.log(`Substituting import path: ${importPath}`);

      modifiedTypings = modifiedTypings.replace(
        new RegExp(`import\\("${importPath}"\\)`, 'g'),
        `import("${notForImportPath}")`,
      );
    }
  });

  return modifiedTypings;
}
