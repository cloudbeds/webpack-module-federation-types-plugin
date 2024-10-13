import path from 'node:path';
import { Worker, parentPort } from 'node:worker_threads';

import { getLogger } from '../helpers';
import type { CompileTypesParams } from './compileTypes';
import type { CompileTypesWorkerMessage } from './compileTypesWorker';

let worker: Worker | null = null;

export function compileTypesAsync(params: CompileTypesParams, loggerHint = ''): Promise<void> {
  const logger = getLogger();

  return new Promise((resolve, reject) => {
    if (worker) {
      logger.log('Terminating existing worker process');
      worker.terminate();
    }

    const workerPath = path.join(__dirname, 'compileWorker.js');
    worker = new Worker(workerPath);

    worker.on('message', (result: CompileTypesWorkerMessage) => {
      switch (result.status) {
        case 'success':
          resolve();
          break;
        case 'failure':
          logger.warn('[Worker]: Failed to compile types for exposed modules.', loggerHint);
          reject(new Error('Failed to compile types for exposed modules.'));
          break;
        case 'error':
          logger.warn('[Worker]: Error compiling types for exposed modules.', loggerHint);
          reject(result.error);
          break;
      }
      worker?.terminate();
      worker = null;
    });

    worker.on('error', error => {
      logger.warn('[Worker]: Unexpected error.', loggerHint);
      logger.log(error);
      reject(error);
      worker?.terminate();
      worker = null;
    });

    worker.on('exit', code => {
      if (code !== 0 && code !== null) {
        reject(new Error(`[Worker]: Process exited with code ${code}`));
      }
      worker = null;
    });

    parentPort?.postMessage({ ...params, logger });
  });
}
