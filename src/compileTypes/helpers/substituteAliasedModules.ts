import { PREFIX_NOT_FOR_IMPORT } from '../../constants';
import { getLogger } from '../../helpers';
import type { CommonLogger } from '../../models';

export function substituteAliasedModules(
  federatedModuleName: string,
  typings: string,
  logger: CommonLogger = getLogger(),
): string {
  // Collect all instances of `import("...")`
  const regexImportPaths = /import\("([^"]*)"\)/g;
  const uniqueImportPaths = new Set<string>();

  let match = regexImportPaths.exec(typings);
  while (match) {
    uniqueImportPaths.add(match[1]);
    match = regexImportPaths.exec(typings);
  }

  let modifiedTypings = typings;

  const filteredImportPaths = Array.from(uniqueImportPaths).filter(
    path => !path.startsWith(PREFIX_NOT_FOR_IMPORT),
  );

  if (filteredImportPaths.length) {
    logger.log(`Unique import paths in ${federatedModuleName}:`);
    logger.log(JSON.stringify(filteredImportPaths, null, 2));
  }

  filteredImportPaths.forEach(importPath => {
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
