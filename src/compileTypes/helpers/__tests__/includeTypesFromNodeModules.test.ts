import { FederationConfig } from '../../../models';
import { setLogger } from '../../../helpers';
import { includeTypesFromNodeModules } from '../includeTypesFromNodeModules';

// Assuming logger mock setup is similar to previous example
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
};

setLogger(mockLogger);

describe('includeTypesFromNodeModules', () => {
  test('correctly includes typings for exposed NPM packages', () => {
    const federationConfig: FederationConfig = {
      name: 'myApp',
      exposes: {
        ModuleA: './node_modules/libraryA',
        ModuleB: './node_modules/libraryB',
      },
    };
    const initialTypings = 'initial typings content';

    const result = includeTypesFromNodeModules(federationConfig, initialTypings);

    const moduleADeclaration = [
      'declare module "myApp/ModuleA" {',
      '  export * from "libraryA"',
      '}',
    ].join('\n');
    const moduleBDeclaration = [
      'declare module "myApp/ModuleB" {',
      '  export * from "libraryB"',
      '}',
    ].join('\n');

    expect(result).toBe([initialTypings, moduleADeclaration, moduleBDeclaration].join('\n'));
    expect(mockLogger.log).toHaveBeenCalledWith('Including typings for npm packages:', [
      ['ModuleA', 'libraryA'],
      ['ModuleB', 'libraryB'],
    ]);
  });

  test('does not modify typings when there are no NPM package paths', () => {
    const federationConfig: FederationConfig = {
      name: 'myApp',
      exposes: {
        LocalModule: './src/LocalModule',
      },
    };
    const initialTypings = 'initial typings content';

    const result = includeTypesFromNodeModules(federationConfig, initialTypings);

    expect(result).toBe(initialTypings);
    expect(mockLogger.log).not.toHaveBeenCalledWith();
  });
});
