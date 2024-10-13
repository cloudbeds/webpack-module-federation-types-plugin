import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';

import type { CompileTypesParams, CompileTypesResult } from './compileTypes';

let currentWorker: ChildProcess | null = null;

export function compileTypesAsync(params: CompileTypesParams): Promise<CompileTypesResult> {
  return new Promise((resolve, reject) => {
    if (currentWorker) {
      currentWorker.kill();
    }

    const workerPath = path.join(__dirname, 'compileWorker.js');
    currentWorker = fork(workerPath);

    currentWorker.on('message', (result: CompileTypesResult) => {
      resolve(result);
      currentWorker?.kill();
      currentWorker = null;
    });

    currentWorker.on('error', error => {
      reject(error);
      currentWorker?.kill();
      currentWorker = null;
    });

    currentWorker.on('exit', code => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Worker process exited with code ${code}`));
      }
      currentWorker = null;
    });

    currentWorker.send(params);
  });
}
