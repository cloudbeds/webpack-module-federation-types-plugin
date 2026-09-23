import { parentPort } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { FederationConfig } from '../../models';
import { writeSharedDepsManifest } from '../../sharedDeps';
import { compileTypes } from '../compileTypes';
import type { CompileTypesWorkerMessage } from '../compileTypesWorker';
import { rewritePathsWithExposedFederatedModules } from '../rewritePathsWithExposedFederatedModules';
import { workerLogger } from '../workerLogger';

vi.mock('node:worker_threads', () => ({
  parentPort: {
    on: vi.fn(),
    postMessage: vi.fn(),
  },
}));

vi.mock('../compileTypes', () => ({
  compileTypes: vi.fn(),
}));

vi.mock('../rewritePathsWithExposedFederatedModules', () => ({
  rewritePathsWithExposedFederatedModules: vi.fn(),
}));

vi.mock('../../sharedDeps', () => ({
  writeSharedDepsManifest: vi.fn().mockReturnValue({}),
}));

vi.mock('../workerLogger', () => ({
  workerLogger: {
    log: vi.fn(),
    info: vi.fn(),
  },
}));

describe('compileTypesWorker', () => {
  const mockParentPort = vi.mocked(parentPort);
  const mockCompileTypes = vi.mocked(compileTypes);
  const mockRewritePaths = vi.mocked(rewritePathsWithExposedFederatedModules);
  const mockWriteSharedDepsManifest = vi.mocked(writeSharedDepsManifest);

  let messageHandler: (message: CompileTypesWorkerMessage) => void;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();

    mockWriteSharedDepsManifest.mockReturnValue({});
    messageHandler = vi.fn();
    mockParentPort!.on.mockImplementation((event, handler) => {
      if (event === 'message') {
        messageHandler = handler;
      }
      return mockParentPort!;
    });

    await import('../compileTypesWorker');
  });

  afterEach(() => {
    vi.resetModules();
  });

  test('handles successful compilation and rewrite', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: {
        './moduleA': 'moduleA',
        './moduleB': 'moduleB',
      },
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: { shared: ['react'] } as FederationConfig,
    };

    mockCompileTypes.mockReturnValue({ isSuccess: true, typeDefinitions: 'type definitions' });
    mockWriteSharedDepsManifest.mockReturnValue({ react: '18.3.1' });

    messageHandler(workerMessage);

    expect(mockCompileTypes).toHaveBeenCalledWith(
      expect.objectContaining({
        tsconfigPath: 'tsconfig.json',
        exposedModules: {
          './moduleA': 'moduleA',
          './moduleB': 'moduleB',
        },
        outFile: 'dist/types.d.ts',
        dirGlobalTypes: 'src/@types',
      }),
      workerLogger,
    );

    expect(mockRewritePaths).toHaveBeenCalledWith(
      { shared: ['react'] },
      'dist/types.d.ts',
      'type definitions',
      workerLogger,
    );

    expect(mockWriteSharedDepsManifest).toHaveBeenCalledWith(['react'], 'dist');

    expect(mockParentPort?.postMessage).toHaveBeenCalledWith({ status: 'success' });
  });

  test('does not write shared versions when compilation fails', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: { './moduleA': 'moduleA' },
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: { shared: ['react'] } as FederationConfig,
    };

    mockCompileTypes.mockReturnValue({ isSuccess: false, typeDefinitions: '' });

    messageHandler(workerMessage);

    expect(mockWriteSharedDepsManifest).not.toHaveBeenCalled();
  });

  test('handles compilation failure', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: { './moduleA': 'moduleA' },
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: {} as FederationConfig,
    };

    mockCompileTypes.mockReturnValue({ isSuccess: false, typeDefinitions: '' });

    messageHandler(workerMessage);

    expect(mockParentPort?.postMessage).toHaveBeenCalledWith({ status: 'failure' });
  });

  test('handles errors during compilation', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: { './moduleA': 'moduleA' },
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: {} as FederationConfig,
    };

    const error = new Error('Compilation error');
    mockCompileTypes.mockImplementation(() => {
      throw error;
    });

    messageHandler(workerMessage);

    expect(mockParentPort?.postMessage).toHaveBeenCalledWith({
      status: 'error',
      error,
    });
  });

  test('logs performance metrics', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: { './moduleA': 'moduleA' },
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: {} as FederationConfig,
    };

    mockCompileTypes.mockReturnValue({ isSuccess: true, typeDefinitions: 'type definitions' });

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(3000);

    messageHandler(workerMessage);

    expect(workerLogger.log).toHaveBeenCalledWith('Types compilation completed in 2.00 seconds');
    expect(workerLogger.log).toHaveBeenCalledWith('Typings file rewritten in 1.00 seconds');
    expect(workerLogger.info).toHaveBeenCalledWith('Types compiled in 2.00 + 1.00 seconds');
  });
});
