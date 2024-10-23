import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { getLogger } from '../helpers';
import type {
  CompileTypesWorkerMessage,
  CompileTypesWorkerResultMessage,
} from './compileTypesWorker';

const activeWorkers = new Map<number, Worker>();
let workerIndex = 1;

export function compileTypesAsync(
  params: CompileTypesWorkerMessage,
  loggerHint = '',
): Promise<void> {
  const logger = getLogger();

  activeWorkers.forEach((worker, index) => {
    logger.log(`Terminating existing worker process #${index}`);
    worker.terminate();
  });
  activeWorkers.clear();

  const currentWorkerIndex = workerIndex++;
  const worker = new Worker(path.join(__dirname, 'compileTypesWorker.js'));
  activeWorkers.set(currentWorkerIndex, worker);

  return new Promise((resolve, reject) => {
    worker.on('message', (result: CompileTypesWorkerResultMessage) => {
      switch (result.status) {
        case 'log':
          logger[result.level](`[Worker] run #${currentWorkerIndex}:`, result.message);
          return;
        case 'success':
          resolve();
          break;
        case 'failure':
          logger.warn(
            `[Worker] run #${currentWorkerIndex}: Failed to compile types for exposed modules.`,
            loggerHint,
          );
          reject(new Error('Failed to compile types for exposed modules.'));
          break;
        case 'error':
          logger.warn(
            `[Worker] run #${currentWorkerIndex}: Error compiling types for exposed modules.`,
            loggerHint,
          );
          reject(result.error);
          break;
        default:
          logger.error(`[Worker]: Received unknown status: ${(result as Dict).status}`);
          break;
      }

      worker.terminate();
    });

    worker.on('error', error => {
      logger.warn(`[Worker] run #${currentWorkerIndex}: Unexpected error.`, loggerHint);
      logger.log(error);
      reject(error);
      worker.terminate();
    });

    worker.on('exit', code => {
      const isActiveWorker = activeWorkers.has(currentWorkerIndex);
      if (isActiveWorker) {
        activeWorkers.delete(currentWorkerIndex);
      }

      if (!code || !isActiveWorker) {
        resolve();
      } else {
        reject(new Error(`[Worker] run #${currentWorkerIndex}: Process exited with code ${code}`));
      }
    });

    worker.postMessage(params);
  });
}
