#!/usr/bin/env node

import path from 'path';

import { assertRunningFromRoot, compile, getFederationConfig, rewritePathsWithExposedFederatedModules }
  from './helpers';
import { DIR_EMITTED } from './constants';

assertRunningFromRoot();

const federationConfig = getFederationConfig();
const compileFiles = Object.values(federationConfig.exposes);

const outDir = path.join('dist', DIR_EMITTED);
const outFile = path.resolve(outDir, `${federationConfig.name}.d.ts`);

console.log(`Emitting types for ${compileFiles.length} exposed module(s)`);

const { isSuccess, fileContent } = compile(compileFiles as string[], outFile);
if (!isSuccess) {
  process.exit(1);
}

console.log('Replacing paths with names of exposed federate modules in typings file:', outFile);

rewritePathsWithExposedFederatedModules(federationConfig, outFile, fileContent);
