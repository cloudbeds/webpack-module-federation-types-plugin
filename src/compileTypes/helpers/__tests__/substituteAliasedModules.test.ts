import { describe, expect, test, vi } from 'vitest';

import { PREFIX_NOT_FOR_IMPORT } from '../../../constants';
import { getLogger, setLogger } from '../../../helpers';
import { substituteAliasedModules } from '../substituteAliasedModules';

const mockLogger = {
  log: vi.fn(),
};

setLogger(mockLogger);

describe('substituteAliasedModules', () => {
  const federatedModuleName = 'myCommon';
  const logger = getLogger();

  test("substitutes import function's path argument when #not-for-import declaration exists", () => {
    const modulePath = 'libs/currency';
    const typings = `
      Some import("${modulePath}") more content
      declare module "${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}"
    `;

    const substituted = substituteAliasedModules(federatedModuleName, typings);

    expect(substituted).toBe(`
      Some import("${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}") more content
      declare module "${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}"
    `);
    expect(logger.log).toHaveBeenCalledWith(`Substituting import path: ${modulePath}`);
  });

  test('does not modify typings when a #not-for-import declaration does not exist', () => {
    const originalTypings = 'Some content import("another/module") more content';

    const result = substituteAliasedModules(federatedModuleName, originalTypings);

    expect(result).toBe(originalTypings);
    expect(logger.log).toHaveBeenCalledWith('Unique import paths in myCommon:');
    expect(logger.log).toHaveBeenCalledWith(JSON.stringify(['another/module'], null, 2));
  });
});
