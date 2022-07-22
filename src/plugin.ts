import path from 'path';
import { Compiler, WebpackPluginInstance } from 'webpack';

import { DEFAULT_SYNC_TYPES_INTERVAL_IN_SECONDS, DIR_DIST, DIR_EMITTED_TYPES } from './constants';
import { getRemoteManifestUrls } from './helpers/cloudbedsRemoteManifests';
import { compileTypes, rewritePathsWithExposedFederatedModules } from './helpers/compileTypes';
import { downloadTypes } from './helpers/downloadTypes';
import { getLoggerHint, setLogger } from './helpers/logger';
import { isEveryUrlValid } from './helpers/validation';
import {
  FederationConfig,
  ModuleFederationPluginOptions,
  ModuleFederationTypesPluginOptions,
  SyncTypesOption,
} from './types';

export class ModuleFederationTypesPlugin implements WebpackPluginInstance {
  constructor(public options?: ModuleFederationTypesPluginOptions) {}

  async apply(compiler: Compiler): Promise<void> {
    const PLUGIN_NAME = this.constructor.name;
    let logger = setLogger(compiler.getInfrastructureLogger(PLUGIN_NAME));

    const remoteManifestUrls = getRemoteManifestUrls(this.options);

    if (!isEveryUrlValid(Object.values(remoteManifestUrls || {}))) {
      logger.warn('One or more remote manifest URLs are invalid:', remoteManifestUrls);
      logger.log('Plugin disabled');
      return;
    }

    if (this.options?.syncTypesIntervalInSeconds === SyncTypesOption.DisablePlugin) {
      logger.log('Plugin disabled');
      return;
    }
    const distPath = compiler.options.devServer?.static?.directory || compiler.options.output?.path || DIR_DIST;

    const federationOptions = compiler.options.plugins.find((plugin) => {
      return plugin.constructor.name === 'ModuleFederationPlugin';
    });
    const federationPluginOptions: ModuleFederationPluginOptions = (federationOptions as any)?._options;
    if (!federationPluginOptions?.name) {
      return;
    }

    const { exposes, remotes } = federationPluginOptions;
    const outFile = path.join(distPath, DIR_EMITTED_TYPES, 'index.d.ts');

    // Create types for exposed modules
    const compileTypesHook = () => {
      if (!exposes) { return; }

      const { isSuccess, typeDefinitions } = compileTypes(exposes as string[], outFile);
      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions as FederationConfig, outFile, typeDefinitions);
      } else {
        logger.warn('Failed to compile types for exposed modules.', getLoggerHint(compiler));
      }
    };

    // Import types from remote modules
    const downloadTypesHook = async () => {
      if (!remotes) { return; }

      return downloadTypes(remotes as Record<string, string>, remoteManifestUrls);
    };

    let recompileIntervalId: ReturnType<typeof setInterval>;
    const shouldSyncContinuously = (compiler.options.mode === 'development')
      && (this.options?.syncTypesIntervalInSeconds !== SyncTypesOption.StartupOnly)
    const syncTypesIntervalInSeconds = this.options?.syncTypesIntervalInSeconds
      || DEFAULT_SYNC_TYPES_INTERVAL_IN_SECONDS;

    const compileTypesContinuouslyHook = () => {
      // Reset and create an Interval to recompile and redownload types every 60 seconds after compilation
      clearInterval(recompileIntervalId);
      recompileIntervalId = setInterval(
        () => {
          logger.log(new Date().toLocaleString(), 'Downloading types every', syncTypesIntervalInSeconds, 'seconds');
          downloadTypesHook();
        },
        1000 * syncTypesIntervalInSeconds,
      );

      compileTypesHook();
    };

    logger.log('Downloading types on startup');
    await downloadTypesHook();

    if (shouldSyncContinuously) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
        logger.log('Compiling types on afterEmit event');
        compileTypesContinuouslyHook();
      });
    } else {
      logger.log('Compile types on startup only');
      compileTypesHook();
    }
  }
}
