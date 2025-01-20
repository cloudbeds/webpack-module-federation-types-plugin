import { parentPort } from 'node:worker_threads';

import type { FederationConfig, LogLevel } from '../models';
import { type CompileTypesParams, compileTypes } from './compileTypes';
import { rewritePathsWithExposedFederatedModules } from './rewritePathsWithExposedFederatedModules';
import { workerLogger } from './workerLogger';

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

parentPort?.on('message', (message: CompileTypesWorkerMessage) => {
  const { federationConfig, ...params } = message;

  try {
    const startTime = performance.now();
    const { isSuccess, typeDefinitions } = compileTypes(params, workerLogger);

    if (isSuccess) {
      const timeTakenInSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
      workerLogger.log(`Types compilation completed in ${timeTakenInSeconds} seconds`);

      workerLogger.log(
        `Replacing paths with names of exposed federate modules in typings file: ${params.outFile}`,
      );
      const rewriteStartTime = performance.now();
      rewritePathsWithExposedFederatedModules(
        federationConfig,
        params.outFile,
        typeDefinitions,
        workerLogger,
      );
      const rewriteTimeTakenInSeconds = ((performance.now() - rewriteStartTime) / 1000).toFixed(2);
      workerLogger.log(`Typings file rewritten in ${rewriteTimeTakenInSeconds} seconds`);

      workerLogger.info(
        `Types compiled in ${timeTakenInSeconds} + ${rewriteTimeTakenInSeconds} seconds`,
      );

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
