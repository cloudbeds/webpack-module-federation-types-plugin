import path from 'path';
import { Compiler, WebpackPluginInstance } from 'webpack';

import {
  CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD,
  DEFAULT_DIR_DIST,
  DEFAULT_DIR_DOWNLOADED_TYPES,
  DEFAULT_DIR_EMITTED_TYPES,
  DEFAULT_DIR_GLOBAL_TYPES,
  DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS,
} from './constants';
import { getRemoteManifestUrls } from './helpers/cloudbedsRemoteManifests';
import { compileTypes, rewritePathsWithExposedFederatedModules } from './helpers/compileTypes';
import { downloadTypes } from './helpers/downloadTypes';
import { getLoggerHint, setLogger } from './helpers/logger';
import { isEveryUrlValid } from './helpers/validation';
import {
  FederationConfig,
  ModuleFederationPluginOptions,
  ModuleFederationTypesPluginOptions,
} from './types';

let isCompiledOnce = false;

export class ModuleFederationTypesPlugin implements WebpackPluginInstance {
  constructor(public options?: ModuleFederationTypesPluginOptions) {}

  async apply(compiler: Compiler): Promise<void> {
    const PLUGIN_NAME = this.constructor.name;
    let logger = setLogger(compiler.getInfrastructureLogger(PLUGIN_NAME));

    const remoteManifestUrls = getRemoteManifestUrls(this.options);
    const isCompilationDisabled = !!this.options?.disableTypeCompilation;
    const isDownloadDisabled = this.options?.disableDownladingRemoteTypes
      ?? process.env.DEPLOYMENT_ENV === CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD;

    // Disable plugin when manifest URLs are not valid
    if (!isEveryUrlValid(Object.values(remoteManifestUrls || {}))) {
      logger.warn('One or more remote manifest URLs are invalid:', remoteManifestUrls);
      logger.log('Plugin disabled');
      return;
    }

    // Disable plugin when both compilation and downloading of types is disabled
    if (isCompilationDisabled && isDownloadDisabled) {
      logger.log('Plugin disabled as both type compilation and download features are turned off');
      return;
    }

    // Get ModuleFederationPlugin config
    const federationOptions = compiler.options.plugins.find((plugin) => {
      return plugin.constructor.name === 'ModuleFederationPlugin';
    });
    const federationPluginOptions: ModuleFederationPluginOptions = (federationOptions as any)?._options;
    if (!federationPluginOptions?.name) {
      logger.log('Plugin disabled as ModuleFederationPlugin is not configured properly. The `name` option is missing.');
      return;
    }

    // Define path for the emitted typings file
    const { exposes, remotes } = federationPluginOptions;

    const dirDist = compiler.options.devServer?.static?.directory
      || compiler.options.output?.path
      || DEFAULT_DIR_DIST;
    const dirEmittedTypes = this.options?.dirEmittedTypes || DEFAULT_DIR_EMITTED_TYPES;
    const dirGlobalTypes = this.options?.dirGlobalTypes || DEFAULT_DIR_GLOBAL_TYPES;
    const dirDownloadedTypes = this.options?.dirDownloadedTypes || DEFAULT_DIR_DOWNLOADED_TYPES;
    const outFile = path.join(dirDist, dirEmittedTypes, 'index.d.ts');

    // Create types for exposed modules
    const compileTypesHook = () => {
      const { isSuccess, typeDefinitions } = compileTypes(exposes as string[], outFile, dirGlobalTypes);
      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions as FederationConfig, outFile, typeDefinitions);
      } else {
        logger.warn('Failed to compile types for exposed modules.', getLoggerHint(compiler));
      }
    };

    // Import types from remote modules
    const downloadTypesHook = async () => {
      return downloadTypes(dirEmittedTypes, dirDownloadedTypes, remotes as Record<string, string>, remoteManifestUrls);
    };

    // Determine whether compilation of types should be performed continuously
    // followed by downloading of types when idle for a certain period of time
    let recompileIntervalId: ReturnType<typeof setInterval>;
    const shouldSyncContinuously = (compiler.options.mode === 'development')
      && (this.options?.downloadTypesWhenIdleIntervalInSeconds !== -1)
    const downloadTypesWhenIdleIntervalInSeconds = this.options?.downloadTypesWhenIdleIntervalInSeconds
      || DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS;

    const compileTypesContinuouslyHook = () => {
      // Reset and create an Interval to redownload types every 60 seconds after compilation
      if (remotes && !this.options?.disableDownladingRemoteTypes) {
        clearInterval(recompileIntervalId);
        recompileIntervalId = setInterval(
          () => {
            logger.log(
              new Date().toLocaleString(),
              'Downloading types every', downloadTypesWhenIdleIntervalInSeconds, 'seconds',
            );
            downloadTypesHook();
          },
          1000 * downloadTypesWhenIdleIntervalInSeconds,
        );
      }

      compileTypesHook();
    };

    if (remotes && !this.options?.disableDownladingRemoteTypes) {
      logger.log('Downloading types on startup');
      await downloadTypesHook();
    }

    if (exposes && !isCompilationDisabled) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
        if (shouldSyncContinuously) {
          logger.log('Compiling types on afterEmit event');
          compileTypesContinuouslyHook();
        } else if (!isCompiledOnce) {
          isCompiledOnce = true;
          logger.log('Compile types on startup only');
          compileTypesHook();
        }
      });
    }
  }
}
