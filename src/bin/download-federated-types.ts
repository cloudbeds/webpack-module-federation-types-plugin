#!/usr/bin/env node

import parseArgs from 'minimist';

import {
  DEFAULT_DIR_DOWNLOADED_TYPES, DEFAULT_DIR_EMITTED_TYPES,
} from '../constants';
import {
  downloadTypes, getRemoteManifestUrls,
} from '../downloadTypes';
import {
  isEveryUrlValid, setLogger,
} from '../helpers';

import {
  assertRunningFromRoot, getOptionsFromWebpackConfig,
} from './helpers';

assertRunningFromRoot();

type Argv = {
  'webpack-config'?: string,
};

const argv = parseArgs<Argv>(process.argv.slice(2));
const webpackConfigPath = argv['webpack-config'] || 'webpack/prod.ts';

const { mfPluginOptions, mfTypesPluginOptions } = getOptionsFromWebpackConfig(webpackConfigPath);

const remoteManifestUrls = getRemoteManifestUrls(mfTypesPluginOptions)!;

if (!isEveryUrlValid(Object.values({ ...mfTypesPluginOptions.remoteEntryUrls }))) {
  console.error('One or more remote URLs are invalid:', mfTypesPluginOptions.remoteEntryUrls);
  process.exit(1);
}
if (!isEveryUrlValid(Object.values({ ...remoteManifestUrls }))) {
  console.error('One or more remote manifest URLs are invalid:', remoteManifestUrls);
  process.exit(1);
}

(async () => {
  setLogger(console);

  try {
    await downloadTypes(
      mfTypesPluginOptions?.dirEmittedTypes || DEFAULT_DIR_EMITTED_TYPES,
      mfTypesPluginOptions?.dirDownloadedTypes || DEFAULT_DIR_DOWNLOADED_TYPES,
      mfPluginOptions.remotes,
      mfTypesPluginOptions.remoteEntryUrls,
      remoteManifestUrls,
    );
    console.log('Successfully downloaded federated types.');
  } catch (error) {
    console.error('Error downloading federated types:', error);
    process.exit(1);
  }
})();
