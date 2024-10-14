import { parentPort } from 'node:worker_threads';
import { describe, expect, test, vi } from 'vitest';

import { sendLog, workerLogger } from '../workerLogger';

vi.mock('node:worker_threads', () => ({
  parentPort: {
    postMessage: vi.fn(),
  },
}));

describe('workerLogger', () => {
  const mockPostMessage = vi.mocked(parentPort?.postMessage);

  test('sendLog handles various data types correctly', () => {
    const testData = [
      { a: 'b', c: { d: 'e' } },
      null,
      'c',
      1,
      ['a', 'b'],
      undefined,
      0,
      true,
      false,
      () => 'anonymous function',
      /test/,
    ];

    sendLog('info', testData);

    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'log',
      level: 'info',
      message: [
        '{\n  "a": "b",\n  "c": {\n    "d": "e"\n  }\n}',
        'null',
        'c',
        '1',
        '[\n  "a",\n  "b"\n]',
        '',
        '0',
        'true',
        'false',
        '() => "anonymous function"',
        '/test/',
      ].join(' '),
    });
  });

  test('workerLogger methods call sendLog with correct level and data', () => {
    const logMethods = ['error', 'warn', 'info', 'log', 'group', 'groupCollapsed'] as const;
    const testData = ['Test message', { key: 'value' }, 42, true];

    logMethods.forEach(method => {
      workerLogger[method](...testData);
      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'log',
        level: method,
        message: 'Test message {\n  "key": "value"\n} 42 true',
      });
    });
  });

  test('workerLogger.groupEnd calls sendLog with empty array', () => {
    workerLogger.groupEnd();
    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'log',
      level: 'groupEnd',
      message: '',
    });
  });

  test('sendLog throws error on circular references', () => {
    const circular: Dict = { a: 'circular' };
    circular.self = circular;

    expect(() => sendLog('info', [circular])).toThrow('Converting circular structure to JSON');

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  test('sendLog handles deep nested objects and arrays', () => {
    const deepNested = {
      a: [1, { b: { c: [2, 3, { d: 4 }] } }],
      e: { f: { g: { h: 5 } } },
    };

    sendLog('info', [deepNested]);

    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'log',
      level: 'info',
      message: JSON.stringify(deepNested, null, 2),
    });
  });
});
