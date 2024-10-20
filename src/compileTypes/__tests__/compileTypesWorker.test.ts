import { parentPort } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { FederationConfig } from '../../models';
import { compileTypes } from '../compileTypes';
import type { CompileTypesWorkerMessage, ExitMessage } from '../compileTypesWorker';
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

  let messageHandler: (message: CompileTypesWorkerMessage | ExitMessage) => void;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();

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

  test('handles exit message', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const exitMessage: ExitMessage = { type: 'exit' };

    messageHandler(exitMessage);

    expect(workerLogger.log).toHaveBeenCalledWith('Exiting by request');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test('handles successful compilation and rewrite', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: ['moduleA', 'moduleB'],
      outFile: 'dist/types.d.ts',
      dirGlobalTypes: 'src/@types',
      federationConfig: {} as FederationConfig,
    };

    mockCompileTypes.mockReturnValue({ isSuccess: true, typeDefinitions: 'type definitions' });

    messageHandler(workerMessage);

    expect(mockCompileTypes).toHaveBeenCalledWith(
      expect.objectContaining({
        tsconfigPath: 'tsconfig.json',
        exposedModules: ['moduleA', 'moduleB'],
        outFile: 'dist/types.d.ts',
        dirGlobalTypes: 'src/@types',
      }),
      workerLogger,
    );

    expect(mockRewritePaths).toHaveBeenCalledWith(
      {},
      'dist/types.d.ts',
      'type definitions',
      workerLogger,
    );

    expect(mockParentPort?.postMessage).toHaveBeenCalledWith({ status: 'success' });
  });

  test('handles compilation failure', () => {
    const workerMessage: CompileTypesWorkerMessage = {
      tsconfigPath: 'tsconfig.json',
      exposedModules: ['moduleA'],
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
      exposedModules: ['moduleA'],
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
      exposedModules: ['moduleA'],
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
    expect(workerLogger.info).toHaveBeenCalledWith(
      'Types compilation and modification completed in 2.00 + 1.00 seconds',
    );
  });
});
