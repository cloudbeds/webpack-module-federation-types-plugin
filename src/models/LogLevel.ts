import type { Compilation } from 'webpack';

export type LogLevel = keyof Pick<
  Compilation['logger'],
  'log' | 'info' | 'warn' | 'error' | 'group' | 'groupEnd' | 'groupCollapsed'
>;
