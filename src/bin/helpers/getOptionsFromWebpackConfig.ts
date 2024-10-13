import path from 'node:path';

import type { Compiler } from 'webpack';

import type { ModuleFederationTypesPluginOptions } from '../../models';

export function getOptionsFromWebpackConfig(webpackConfigPath: string) {
  let webpackConfig: Compiler['options'];
  try {
    webpackConfig = require(path.join(process.cwd(), webpackConfigPath));
    webpackConfig =
      ((webpackConfig as unknown as Dict).default as Compiler['options']) || webpackConfig;
    if (typeof webpackConfig === 'function') {
      webpackConfig = (webpackConfig as unknown as () => Compiler['options'])();
    }
  } catch (error) {
    console.error(`Failed to import webpack config from ${webpackConfigPath}:`, error);
    process.exit(1);
  }

  if (!webpackConfig) {
    console.error(`Empty webpack config loaded from ${webpackConfigPath}`);
    process.exit(1);
  }

  function getModuleFederationPluginOptions(config: Compiler['options']) {
    const plugin = config.plugins.find(
      nextPlugin => nextPlugin!.constructor.name === 'ModuleFederationPlugin',
    );
    return (plugin as Dict)?._options as Dict & { remotes?: Dict<string> };
  }

  function getModuleFederationTypesPluginOptions(config: Compiler['options']) {
    const plugin = config.plugins.find(
      nextPlugin => nextPlugin!.constructor.name === 'ModuleFederationTypesPlugin',
    );
    return (plugin as Dict)?.options as ModuleFederationTypesPluginOptions;
  }

  const mfPluginOptions = getModuleFederationPluginOptions(webpackConfig);
  const mfTypesPluginOptions = getModuleFederationTypesPluginOptions(webpackConfig);

  if (!mfTypesPluginOptions || !mfPluginOptions) {
    console.error('Could not find required ModuleFederation plugin options in the webpack config.');
    process.exit(1);
  }

  return {
    mfPluginOptions,
    mfTypesPluginOptions,
  };
}
