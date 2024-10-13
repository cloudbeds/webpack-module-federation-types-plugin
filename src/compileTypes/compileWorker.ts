import {
  compileTypes, CompileTypesParams,
} from './compileTypes';

process.on('message', (message: CompileTypesParams) => {
  process.send?.(compileTypes(message));
});
