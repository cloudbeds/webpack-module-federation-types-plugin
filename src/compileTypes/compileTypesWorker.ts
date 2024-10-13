import { parentPort } from 'node:worker_threads';

import type { Compilation } from 'webpack';
import { type CompileTypesParams, compileTypes } from './compileTypes';
import { rewritePathsWithExposedFederatedModules } from './rewritePathsWithExposedFederatedModules';

type CompileTypesWorkerMessageError = {
  status: 'error';
  error: Error;
};

export type CompileTypesWorkerMessage =
  | { status: 'success' }
  | { status: 'failure' }
  | CompileTypesWorkerMessageError;

parentPort?.on('message', (message: CompileTypesParams & { logger: Compilation['logger'] }) => {
  const { logger, ...params } = message;

  try {
    const startTime = performance.now();
    const { isSuccess, typeDefinitions } = compileTypes(params);

    if (isSuccess) {
      const endTime = performance.now();
      const timeTakenInSeconds = (endTime - startTime) / 1000;
      logger.log(`Types compilation completed in ${timeTakenInSeconds.toFixed(2)} seconds`);

      logger.log(
        `Replacing paths with names of exposed federate modules in typings file: ${params.outFile}`,
      );
      rewritePathsWithExposedFederatedModules(
        params.federationConfig,
        params.outFile,
        typeDefinitions,
      );

      parentPort?.postMessage({ status: 'success' } satisfies CompileTypesWorkerMessage);
    } else {
      parentPort?.postMessage({ status: 'failure' } satisfies CompileTypesWorkerMessage);
    }
  } catch (error) {
    parentPort?.postMessage({
      status: 'error',
      error: error as Error,
    } satisfies CompileTypesWorkerMessageError);
  }
});
