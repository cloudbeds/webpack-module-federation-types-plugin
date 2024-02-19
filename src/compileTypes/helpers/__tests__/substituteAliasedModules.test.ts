import { substituteAliasedModules } from '../substituteAliasedModules';
import {
  getLogger, setLogger,
} from '../../../helpers';
import { PREFIX_NOT_FOR_IMPORT } from '../../../constants';

const mockLogger = {
  log: jest.fn(),
};

setLogger(mockLogger);

describe('substituteAliasedModules', () => {
  const federatedModuleName = 'myCommon';
  const logger = getLogger();

  test('substitutes import path when #not-for-import version exists', () => {
    const modulePath = 'libs/currency';
    const typings = `
      Some import("${modulePath}") more content
      declare module "${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}"
    `;

    const subsituted = substituteAliasedModules(federatedModuleName, typings);

    expect(subsituted).toBe(`
      Some import("${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}") more content
      declare module "${PREFIX_NOT_FOR_IMPORT}/${federatedModuleName}/${modulePath}"
    `);
    expect(logger.log).toHaveBeenCalledWith(`Substituting import path: ${modulePath}`);
  });

  test('does not modify typings when a #not-for-import version does not exist', () => {
    const originalTypings = 'Some content import("another/module") more content';

    const result = substituteAliasedModules(federatedModuleName, originalTypings);

    expect(result).toBe(originalTypings);
    expect(logger.log).not.toHaveBeenCalled();
  });
});
