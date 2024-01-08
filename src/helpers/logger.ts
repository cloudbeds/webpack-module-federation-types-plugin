import {
  Compilation, Compiler,
} from 'webpack';

let loggerInstance: Compilation['logger'];

export function getLogger(): Compilation['logger'] {
  return loggerInstance || console;
}

export function setLogger<TLogger = Compilation['logger']>(logger: TLogger): TLogger {
  loggerInstance = logger as Compilation['logger'];
  return logger;
}

export function getLoggerHint(compiler: Compiler): string {
  return ['none', 'error', 'warn', 'info'].includes(compiler.options.infrastructureLogging.level!)
    ? 'Increase infrastructureLogging level to "log" to see error details.'
    : '';
}
