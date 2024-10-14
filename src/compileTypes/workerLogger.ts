import { parentPort } from 'node:worker_threads';

import type { CommonLogger } from '../models';
import type { LogLevel } from './compileTypesWorker';

export function sendLog(level: LogLevel, message: string) {
  parentPort?.postMessage({ status: 'log', level, message });
}

export const workerLogger: CommonLogger = {
  error: (message: string) => sendLog('error', message),
  warn: (message: string) => sendLog('warn', message),
  info: (message: string) => sendLog('info', message),
  log: (message: string) => sendLog('log', message),
  debug: (message: string) => sendLog('debug', message),
};
