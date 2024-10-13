#!/usr/bin/env node

import path from 'node:path';

import parseArgs from 'minimist';

import { rewritePathsWithExposedFederatedModules } from '../compileTypes';
import { compileTypesAsync } from '../compileTypes/compileTypesAsync';
import {
  DEFAULT_DIR_DIST,
  DEFAULT_DIR_EMITTED_TYPES,
  DEFAULT_DIR_GLOBAL_TYPES,
  TS_CONFIG_FILE,
} from '../constants';
import { setLogger } from '../helpers';
import type { FederationConfig } from '../models';
import { assertRunningFromRoot } from './helpers/assertRunningFromRoot';
import { getFederationConfig } from './helpers/getFederationConfig';
import { getOptionsFromWebpackConfig } from './helpers/getOptionsFromWebpackConfig';
import { getWebpackConfigPathFromArgs } from './helpers/getWebpackConfigPathFromArgs';

assertRunningFromRoot();

type Argv = {
  'global-types': string;
  'federation-config'?: string;
  'output-types-folder': string;
  tsconfig: string;
  'webpack-config'?: string;
};

const argv = parseArgs<Argv>(process.argv.slice(2), {
  alias: {
    'global-types': 'g',
    'output-types-folder': 'o',
    'federation-config': 'c',
    tsconfig: 't',
  } as Partial<Argv>,
});

let federationConfig: FederationConfig;
if (argv['federation-config']) {
  federationConfig = getFederationConfig(argv['federation-config']);
} else {
  const webpackConfigPath = getWebpackConfigPathFromArgs(argv['webpack-config']);
  federationConfig = getOptionsFromWebpackConfig(webpackConfigPath)
    .mfPluginOptions as FederationConfig;
}

const exposedModules = Object.values(federationConfig.exposes);
const outDir =
  argv['output-types-folder'] || path.join(DEFAULT_DIR_DIST, DEFAULT_DIR_EMITTED_TYPES);
const outFile = path.join(outDir, 'index.d.ts');
const dirGlobalTypes = argv['global-types'] || DEFAULT_DIR_GLOBAL_TYPES;
const tsconfigPath = argv.tsconfig || TS_CONFIG_FILE;

console.log(`Emitting types for ${exposedModules.length} exposed module(s)`);

setLogger(console);

compileTypesAsync({
  tsconfigPath,
  exposedModules,
  outFile,
  dirGlobalTypes,
})
  .then(({ isSuccess, typeDefinitions }) => {
    if (!isSuccess) {
      console.error('Failed to compile types');
      process.exit(1);
    }

    console.log('Replacing paths with names of exposed federate modules in typings file:', outFile);

    rewritePathsWithExposedFederatedModules(federationConfig, outFile, typeDefinitions);

    console.log(
      `Asynchronous types compilation completed successfully in ${process.uptime()} seconds`,
    );
  })
  .catch(error => {
    console.error('Error during type compilation:', error);
    process.exit(1);
  });
