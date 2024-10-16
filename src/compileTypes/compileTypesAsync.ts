import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { getLogger } from '../helpers';
import type {
  CompileTypesWorkerMessage,
  CompileTypesWorkerResultMessage,
} from './compileTypesWorker';

let worker: Worker | null = null;
let workerIndex = 0;

export function compileTypesAsync(
  params: CompileTypesWorkerMessage,
  loggerHint = '',
): Promise<void> {
  const logger = getLogger();
  workerIndex++;
  const innerWorkerIndex = workerIndex;

  return new Promise((resolve, reject) => {
    if (worker) {
      logger.log(`Terminating existing worker process #${innerWorkerIndex}`);
      worker.postMessage({ type: 'exit' });
    }

    const workerPath = path.join(__dirname, 'compileTypesWorker.js');
    worker = new Worker(workerPath);

    worker.on('message', (result: CompileTypesWorkerResultMessage) => {
      switch (result.status) {
        case 'log':
          logger[result.level](`[Worker] run #${innerWorkerIndex}:`, result.message);
          return;
        case 'success':
          resolve();
          break;
        case 'failure':
          logger.warn(
            `[Worker] run #${innerWorkerIndex}: Failed to compile types for exposed modules.`,
            loggerHint,
          );
          reject(new Error('Failed to compile types for exposed modules.'));
          break;
        case 'error':
          logger.warn(
            `[Worker] run #${innerWorkerIndex}: Error compiling types for exposed modules.`,
            loggerHint,
          );
          reject(result.error);
          break;
      }
      worker?.postMessage({ type: 'exit' });
      worker = null;
    });

    worker.on('error', error => {
      logger.warn(`[Worker] run #${innerWorkerIndex}: Unexpected error.`, loggerHint);
      logger.log(error);
      reject(error);
      worker?.postMessage({ type: 'exit' });
      worker = null;
    });

    worker.on('exit', code => {
      if (code === null || code === 0) {
        resolve();
      } else {
        reject(new Error(`[Worker] run #${innerWorkerIndex}: Process exited with code ${code}`));
      }
      worker = null;
    });

    worker.postMessage(params);
  });
}
