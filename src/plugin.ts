import download from 'download';
import path from 'path';
import { Compiler, container, WebpackPluginInstance } from 'webpack';

import { DEFAULT_SYNC_TYPES_INTERVAL_IN_SECONDS, DIR_DOWNLOADED, DIR_EMITTED } from './constants';
import { compile, isValidUrl, rewritePathsWithExposedFederatedModules } from './helpers';
import { FederationConfig } from './types';

type ModuleFederationPluginOptions = ConstructorParameters<typeof container.ModuleFederationPlugin>[0];

type MFTypesPluginOptions = {
  syncTypesIntervalInSeconds?: number;
}

export class ModuleFederationTypesPlugin implements WebpackPluginInstance {
  constructor(public options?: MFTypesPluginOptions) {}

  apply(compiler: Compiler): void {
    if (this.options?.syncTypesIntervalInSeconds === -1) {
      return;
    }
    const distPath = compiler.options.devServer?.static?.directory || compiler.options.output?.path || 'dist';

    const federationOptions = compiler.options.plugins.find((plugin) => {
      return plugin.constructor.name === 'ModuleFederationPlugin';
    });
    const federationPluginOptions: ModuleFederationPluginOptions | null = (federationOptions as any)?._options || null;
    if (!federationPluginOptions) {
      return;
    }

    const { name, exposes, remotes } = federationPluginOptions;
    const outFile = path.join(distPath, DIR_EMITTED, `${name}.d.ts`);

    // Create types for exposed modules
    function emitTypes() {
      if (!exposes) { return; }

      const { isSuccess, fileContent } = compile(exposes as string[], outFile);
      if (isSuccess) {
        rewritePathsWithExposedFederatedModules(federationPluginOptions as FederationConfig, outFile, fileContent);
      }
    }

    // Import types from remote modules
    function downloadTypes() {
      if (!remotes) { return; }

      Object.values(remotes).map(async remote => {
        const remoteName = remote.split('@')[0]
        const remoteLocation = remote.split('@')[1]
        let remoteDistUrl: string = '';

        if (isValidUrl(remoteLocation)) {
          remoteDistUrl = new URL(remoteLocation).origin;
        }

        if (remoteDistUrl) {
          const options = { insecure: true, rejectUnauthorized: false };
          download(`${remoteDistUrl}/${DIR_EMITTED}/${remoteName}.d.ts`, DIR_DOWNLOADED, options)
        } else {
          console.error(remote, 'is not a valid remote federated module URL');
        }
      });
    }

    let recompileIntervalId: ReturnType<typeof setInterval>;
    const shouldRecompileOnInterval = (compiler.options.mode === 'development')
      && (this.options?.syncTypesIntervalInSeconds !== 0)

    const compileHookCallback = () => {
      if (shouldRecompileOnInterval) {
        // Reset and create an Interval to recompile and redownload types every 60 seconds after compilation
        clearInterval(recompileIntervalId);
        recompileIntervalId = setInterval(
          () => {
            downloadTypes();
            emitTypes();
          },
          1000 * (this.options?.syncTypesIntervalInSeconds || DEFAULT_SYNC_TYPES_INTERVAL_IN_SECONDS),
        );
      }

      // Runs a compilation and download immediately
      emitTypes();
    };

    compiler.hooks.initialize.tap('FederatedTypes', downloadTypes)
    compiler.hooks.afterEmit.tap('FederatedTypes', compileHookCallback)
  }
}
