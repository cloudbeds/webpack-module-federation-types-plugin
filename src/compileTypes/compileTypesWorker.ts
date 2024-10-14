import { parentPort } from 'node:worker_threads';

import type { Compilation } from 'webpack';
import type { FederationConfig } from '../models';
import { type CompileTypesParams, compileTypes } from './compileTypes';
import { rewritePathsWithExposedFederatedModules } from './rewritePathsWithExposedFederatedModules';
import { sendLog, workerLogger } from './workerLogger';

export type LogLevel = keyof Pick<
  Compilation['logger'],
  'log' | 'info' | 'warn' | 'error' | 'debug'
>;

type CompileTypesWorkerResultMessageError = {
  status: 'error';
  error: Error;
};

export type CompileTypesWorkerMessage = CompileTypesParams & {
  federationConfig: FederationConfig;
};

export type CompileTypesWorkerResultMessage =
  | { status: 'success' }
  | { status: 'failure' }
  | CompileTypesWorkerResultMessageError
  | { status: 'log'; level: LogLevel; message: string };

parentPort?.on('message', ({ federationConfig, ...params }: CompileTypesWorkerMessage) => {
  try {
    let startTime = performance.now();
    const { isSuccess, typeDefinitions } = compileTypes(params, workerLogger);

    if (isSuccess) {
      let endTime = performance.now();
      let timeTakenInSeconds = (endTime - startTime) / 1000;
      sendLog('log', `Types compilation completed in ${timeTakenInSeconds.toFixed(2)} seconds`);

      sendLog(
        'log',
        `Replacing paths with names of exposed federate modules in typings file: ${params.outFile}`,
      );
      startTime = performance.now();
      rewritePathsWithExposedFederatedModules(
        federationConfig,
        params.outFile,
        typeDefinitions,
        workerLogger,
      );
      endTime = performance.now();
      timeTakenInSeconds = (endTime - startTime) / 1000;
      sendLog('log', `Typings file rewritten in ${timeTakenInSeconds.toFixed(2)} seconds`);

      parentPort?.postMessage({ status: 'success' } satisfies CompileTypesWorkerResultMessage);
    } else {
      parentPort?.postMessage({ status: 'failure' } satisfies CompileTypesWorkerResultMessage);
    }
  } catch (error) {
    parentPort?.postMessage({
      status: 'error',
      error: error as Error,
    } satisfies CompileTypesWorkerResultMessageError);
  }
});
