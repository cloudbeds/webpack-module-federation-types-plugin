#!/usr/bin/env node

import path from 'path';

import { assertRunningFromRoot, getFederationConfig}
  from './helpers';
import { DIR_DIST, DIR_EMITTED } from './constants';
import { compileTypes, rewritePathsWithExposedFederatedModules } from './helpers/compileTypes';

assertRunningFromRoot();

const federationConfig = getFederationConfig();
const compileFiles = Object.values(federationConfig.exposes);

const outDir = path.join(DIR_DIST, DIR_EMITTED);
const outFile = path.resolve(outDir, `${federationConfig.name}.d.ts`);

console.log(`Emitting types for ${compileFiles.length} exposed module(s)`);

const { isSuccess, typeDefinitions } = compileTypes(compileFiles as string[], outFile);
if (!isSuccess) {
  process.exit(1);
}

console.log('Replacing paths with names of exposed federate modules in typings file:', outFile);

rewritePathsWithExposedFederatedModules(federationConfig, outFile, typeDefinitions);
