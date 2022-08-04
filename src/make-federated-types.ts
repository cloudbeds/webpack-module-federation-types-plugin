#!/usr/bin/env node

import parseArgs from 'minimist';
import path from 'path';

import { DEFAULT_DIR_DIST, DEFAULT_DIR_EMITTED_TYPES, DEFAULT_DIR_GLOBAL_TYPES } from './constants';
import { compileTypes, rewritePathsWithExposedFederatedModules } from './helpers/compileTypes';
import { assertRunningFromRoot, getFederationConfig } from './helpers/cli';

assertRunningFromRoot();

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    'global-types': 'g',
    'output-types-folder': 'o',
  },
});

const federationConfig = getFederationConfig();
const compileFiles = Object.values(federationConfig.exposes);

const outDir = argv['output-types-folder'] || path.join(DEFAULT_DIR_DIST, DEFAULT_DIR_EMITTED_TYPES);
const outFile = path.join(outDir, 'index.d.ts');
const dirGlobalTypes = argv['global-types'] || DEFAULT_DIR_GLOBAL_TYPES;

console.log(`Emitting types for ${compileFiles.length} exposed module(s)`);

const { isSuccess, typeDefinitions } = compileTypes(compileFiles as string[], outFile, dirGlobalTypes);
if (!isSuccess) {
  process.exit(1);
}

console.log('Replacing paths with names of exposed federate modules in typings file:', outFile);

rewritePathsWithExposedFederatedModules(federationConfig, outFile, typeDefinitions);
