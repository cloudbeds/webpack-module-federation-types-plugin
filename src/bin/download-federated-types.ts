#!/usr/bin/env node

import parseArgs from 'minimist';

import { DEFAULT_DIR_DOWNLOADED_TYPES, DEFAULT_DIR_EMITTED_TYPES } from '../constants';
import { downloadTypes, getRemoteManifestUrls } from '../downloadTypes';
import { isEveryUrlValid, setLogger } from '../helpers';
import { assertRunningFromRoot } from './helpers/assertRunningFromRoot';
import { getOptionsFromWebpackConfig } from './helpers/getOptionsFromWebpackConfig';
import { getWebpackConfigPathFromArgs } from './helpers/getWebpackConfigPathFromArgs';

assertRunningFromRoot();

type Argv = {
  'webpack-config'?: string;
};

const argv = parseArgs<Argv>(process.argv.slice(2));
const webpackConfigPath = getWebpackConfigPathFromArgs(argv['webpack-config']);

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
    const { downloaded, failed, manifestError } = await downloadTypes(
      mfTypesPluginOptions?.dirEmittedTypes || DEFAULT_DIR_EMITTED_TYPES,
      mfTypesPluginOptions?.dirDownloadedTypes || DEFAULT_DIR_DOWNLOADED_TYPES,
      mfPluginOptions.remotes,
      mfTypesPluginOptions.remoteEntryUrls,
      remoteManifestUrls,
    );

    if (manifestError) {
      console.error(
        'No federated types were downloaded: the remote manifest could not be read from',
        manifestError.url || remoteManifestUrls,
      );
      // The `return` is what stops a test that stubs process.exit; under the real
      // process.exit, typed `never`, it is unreachable.
      return process.exit(1);
    }

    if (failed.length) {
      console.error(
        `Failed to download federated types for ${failed.length} of ${failed.length + downloaded.length} remotes:`,
      );
      failed.forEach(({ remoteName, url, error }) => {
        const reason = (error as Error)?.message || String(error);
        console.error(`  ${remoteName}: ${url || 'no resolvable URL'} (${reason})`);
      });
      return process.exit(1);
    }

    console.log('Successfully downloaded federated types.');
  } catch (error) {
    console.error('Error downloading federated types:', error);
    return process.exit(1);
  }
})();
