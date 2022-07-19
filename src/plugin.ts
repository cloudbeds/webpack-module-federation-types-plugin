import path from 'path';
import { Compiler, WebpackPluginInstance } from 'webpack';

import { DEFAULT_SYNC_TYPES_INTERVAL_IN_SECONDS, DIR_DIST, DIR_EMITTED, PLUGIN_NAME } from './constants';
import {
  FederationConfig,
  ModuleFederationPluginOptions,
  ModuleFederationTypesPluginOptions,
  SyncTypesOption,
} from './types';
import { compileTypes, downloadTypes, rewritePathsWithExposedFederatedModules } from './helpers';

export class ModuleFederationTypesPlugin implements WebpackPluginInstance {
  constructor(public options?: ModuleFederationTypesPluginOptions) {}

  apply(compiler: Compiler): void {
    const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);

    if (this.options?.syncTypesIntervalInSeconds === SyncTypesOption.DisablePlugin) {
      logger.log(PLUGIN_NAME, 'is disabled');
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

    const { name, exposes, remotes } = federationPluginOptions;
    const outFile = path.join(distPath, DIR_EMITTED, `${name}.d.ts`);

    // Create types for exposed modules
    const compileTypesHook = () => {
      if (!exposes) { return; }

      const { isSuccess, typeDefinitions } = compileTypes(exposes as string[], outFile);
      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions as FederationConfig, outFile, typeDefinitions);
      }
    };

    // Import types from remote modules
    const downloadTypesHook = async () => {
      if (!remotes) { return; }

      return downloadTypes(
        distPath,
        remotes as Record<string, string>,
        this.options?.remoteManifestUrls,
      );
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
          logger.log(PLUGIN_NAME, 'synchronizing types every', syncTypesIntervalInSeconds, 'seconds');
          downloadTypesHook();
          compileTypesHook();
        },
        1000 * syncTypesIntervalInSeconds,
      );

      compileTypesHook();
    };

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, () => {
      logger.log(PLUGIN_NAME, 'downloading types on watchRun event');
      return downloadTypesHook();
    });

    if (shouldSyncContinuously) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
        logger.log(PLUGIN_NAME, 'compiling types on afterEmit event');
        compileTypesContinuouslyHook();
      });
    } else {
      logger.log(PLUGIN_NAME, 'synchronizing types on startup only');
      compileTypesHook();
    }
  }
}
