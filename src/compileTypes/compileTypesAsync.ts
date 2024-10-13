import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { getLogger } from '../helpers';
import type {
  CompileTypesWorkerMessage,
  CompileTypesWorkerResultMessage,
} from './compileTypesWorker';

let worker: Worker | null = null;

export function compileTypesAsync(
  params: CompileTypesWorkerMessage,
  loggerHint = '',
): Promise<void> {
  const logger = getLogger();

  return new Promise((resolve, reject) => {
    if (worker) {
      logger.log('Terminating existing worker process');
      worker.terminate();
    }

    const workerPath = path.join(__dirname, 'compileTypesWorker.js');
    worker = new Worker(workerPath);

    worker.on('message', (result: CompileTypesWorkerResultMessage) => {
      switch (result.status) {
        case 'log':
          logger[result.level]('[Worker]:', result.message);
          return;
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
      if (code === null || code === 0 || code === 1) {
        logger.log(`[Worker]: Process exited with code ${code}`);
        resolve();
      } else {
        reject(new Error(`[Worker]: Process exited with code ${code}`));
      }
      worker = null;
    });

    worker.postMessage(params);
  });
}
