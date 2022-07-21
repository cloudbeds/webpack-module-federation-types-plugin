import { Compilation } from 'webpack';

let loggerInstance: Compilation['logger'];

export function getLogger(): Compilation['logger'] {
  return loggerInstance || console;
}

export function setLogger(logger: Compilation['logger']): Compilation['logger'] {
  loggerInstance = logger;
  return logger;
}
