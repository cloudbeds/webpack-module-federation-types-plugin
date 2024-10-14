import { describe, expect, test, vi } from 'vitest';

import { setLogger } from '../../../helpers';
import type { FederationConfig } from '../../../models';
import { includeTypesFromNodeModules } from '../includeTypesFromNodeModules';

const mockLogger = {
  log: vi.fn(),
  warn: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
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
    expect(mockLogger.groupCollapsed).toHaveBeenCalledWith(
      'Including typings for npm packages',
      '(2 packages)',
    );
    expect(mockLogger.log).toHaveBeenCalledWith([
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
    expect(mockLogger.log).not.toHaveBeenCalled();
  });
});
