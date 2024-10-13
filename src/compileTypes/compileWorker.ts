import { type CompileTypesParams, compileTypes } from './compileTypes';

process.on('message', (message: CompileTypesParams) => {
  process.send?.(compileTypes(message));
});
