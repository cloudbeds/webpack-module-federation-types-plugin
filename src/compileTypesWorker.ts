import { parentPort } from 'worker_threads';
import { compileTypes, rewritePathsWithExposedFederatedModules } from './compileTypes';

parentPort?.on('message', async (message) => {
  const { task, args } = message;

  if (task === 'compile') {
    const {
      tsconfig,
      exposes,
      outFile,
      dirGlobalTypes,
      federationPluginOptions,
      shouldCompileTypesContinuously
    } = args;

    try {
      const { isSuccess, typeDefinitions } = compileTypes(
        tsconfig,
        exposes,
        outFile,
        dirGlobalTypes
      );

      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions, outFile, typeDefinitions);
        parentPort?.postMessage({ status: 'success', message: 'Types compiled successfully.' });
        if (!shouldCompileTypesContinuously) {
          process.exit(0);
        }
      } else {
        parentPort?.postMessage({ status: 'error', message: 'Failed to compile types.' });
        if (!shouldCompileTypesContinuously) {
          process.exit(127);
        }
      }
    } catch (error: any) {
      parentPort?.postMessage({
        status: 'error',
        message: 'Error during compilation',
        error: error?.message,
        stack: error?.stack
      });
      if (!shouldCompileTypesContinuously) {
        process.exit(127);
      }
    }
  }
});
