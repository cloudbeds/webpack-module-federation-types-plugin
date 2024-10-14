import { parentPort } from 'node:worker_threads';

import type { CommonLogger } from '../models';
import type { LogLevel } from '../models';

export function sendLog(level: LogLevel, items: unknown[]) {
  parentPort?.postMessage({
    status: 'log',
    level,
    message: items
      .map(item =>
        typeof item === 'object' &&
        !(item instanceof RegExp) &&
        !(item instanceof Date) &&
        !(item instanceof Function) &&
        !(item instanceof Error)
          ? JSON.stringify(item, null, 2)
          : item?.toString(),
      )
      .join(' '),
  });
}

export const workerLogger: CommonLogger = {
  error: (...data: unknown[]) => sendLog('error', data),
  warn: (...data: unknown[]) => sendLog('warn', data),
  info: (...data: unknown[]) => sendLog('info', data),
  log: (...data: unknown[]) => sendLog('log', data),
  group: (...data: unknown[]) => sendLog('group', data),
  groupEnd: () => sendLog('groupEnd', []),
  groupCollapsed: (...data: unknown[]) => sendLog('groupCollapsed', data),
};
