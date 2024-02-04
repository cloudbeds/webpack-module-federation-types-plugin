import path from 'path';

import {
  Compiler, WebpackPluginInstance,
} from 'webpack';

import {
  CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD,
  DEFAULT_DIR_DIST,
  DEFAULT_DIR_DOWNLOADED_TYPES,
  DEFAULT_DIR_EMITTED_TYPES,
  DEFAULT_DIR_GLOBAL_TYPES,
  DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS,
  TS_CONFIG_FILE,
} from './constants';
import {
  compileTypes, rewritePathsWithExposedFederatedModules,
} from './compileTypes';
import {
  downloadTypes, getRemoteManifestUrls,
} from './downloadTypes';
import {
  getLoggerHint, isEveryUrlValid, setLogger,
} from './helpers';
import {
  FederationConfig,
  ModuleFederationPluginOptions,
  ModuleFederationTypesPluginOptions,
} from './models';

let isCompiledOnce = false;
const isDownloadedOnce = false;

export class ModuleFederationTypesPlugin implements WebpackPluginInstance {
  constructor(public options?: ModuleFederationTypesPluginOptions) {}

  apply(compiler: Compiler): void {
    const PLUGIN_NAME = this.constructor.name;
    const logger = setLogger(compiler.getInfrastructureLogger(PLUGIN_NAME));

    const remoteEntryUrls = this.options?.remoteEntryUrls;
    const remoteManifestUrls = getRemoteManifestUrls(this.options);
    const isCompilationDisabled = !!this.options?.disableTypeCompilation;
    const isDownloadDisabled = this.options?.disableDownladingRemoteTypes
      ?? process.env.DEPLOYMENT_ENV === CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD;

    // Disable plugin when some URLs are not valid
    if (!isEveryUrlValid(Object.values({ ...remoteEntryUrls }))) {
      logger.warn('One or more remote URLs are invalid:', remoteEntryUrls);
      logger.log('Plugin disabled');
      return;
    }
    if (!isEveryUrlValid(Object.values({ ...remoteManifestUrls }))) {
      logger.warn('One or more remote manifest URLs are invalid:', remoteManifestUrls);
      logger.log('Plugin disabled');
      return;
    }

    // Disable plugin when both compilation and downloading of types is disabled
    if (isCompilationDisabled && isDownloadDisabled) {
      logger.log('Plugin disabled as both type compilation and download features are turned off');
      return;
    }

    const moduleFederationPluginNames = [
      this.options?.moduleFederationPluginName, // Custom module federation plugin, such as NextFederationPlugin
      'ModuleFederationPlugin',
      'ModuleFederationPluginV1', // WMF v1.0 in Rspack
    ];

    // Get ModuleFederationPlugin config
    const federationOptions = compiler.options.plugins.find(
      plugin => plugin!.constructor.name && moduleFederationPluginNames.includes(plugin!.constructor.name),
    );

    // eslint-disable-next-line no-underscore-dangle
    const federationPluginOptions: ModuleFederationPluginOptions = (federationOptions as any)?._options;

    if (!federationPluginOptions?.name) {
      logger.warn(
        'Plugin disabled as ModuleFederationPlugin is not configured properly. The "name" option is missing.',
      );
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
    const tsconfig = TS_CONFIG_FILE;
    const outFile = path.join(dirDist, dirEmittedTypes, 'index.d.ts');

    // Create types for exposed modules
    const compileTypesAfterEmit = () => {
      const { isSuccess, typeDefinitions } = compileTypes(
        tsconfig,
        exposes as string[],
        outFile,
        dirGlobalTypes,
      );

      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions as FederationConfig, outFile, typeDefinitions);
      } else {
        logger.warn('Failed to compile types for exposed modules.', getLoggerHint(compiler));
      }
    };

    // Import types from remote modules
    const downloadRemoteTypes = async () => downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotes as Dict<string>,
      remoteEntryUrls,
      remoteManifestUrls,
    );

    // Determine whether compilation of types should be performed continuously
    // followed by downloading of types when idle for a certain period of time
    let recompileIntervalId: ReturnType<typeof setInterval>;
    const shouldSyncContinuously = (compiler.options.mode === 'development')
      && (this.options?.downloadTypesWhenIdleIntervalInSeconds !== -1);
    const downloadTypesWhenIdleIntervalInSeconds = this.options?.downloadTypesWhenIdleIntervalInSeconds
      || DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS;

    const compileTypesContinuouslyAfterEmit = () => {
      // Reset and create an Interval to redownload types every 60 seconds after compilation
      if (remotes && !isDownloadDisabled) {
        clearInterval(recompileIntervalId);
        recompileIntervalId = setInterval(
          () => {
            logger.log(
              new Date().toLocaleString(),
              'Downloading types every',
              downloadTypesWhenIdleIntervalInSeconds,
              'seconds',
            );
            downloadRemoteTypes();
          },
          1000 * downloadTypesWhenIdleIntervalInSeconds,
        );
      }

      compileTypesAfterEmit();
    };

    if (remotes && !this.options?.disableDownladingRemoteTypes) {
      compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, () => {
        logger.log('Downloading types on startup');
        return downloadRemoteTypes();
      });
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
        if (!isDownloadedOnce) {
          logger.log('Downloading types on startup');
          return downloadRemoteTypes();
        }
        return Promise.resolve();
      });
    }

    if (exposes && !isCompilationDisabled) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
        if (shouldSyncContinuously) {
          logger.log('Compiling types on afterEmit event');
          compileTypesContinuouslyAfterEmit();
        } else if (!isCompiledOnce) {
          isCompiledOnce = true;
          logger.log('Compile types on startup only');
          compileTypesAfterEmit();
        }
      });
    }
  }
}
