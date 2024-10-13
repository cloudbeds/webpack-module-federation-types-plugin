import { describe, expect, test, vi } from 'vitest';
import webpack, { type Compilation, type Compiler } from 'webpack';

import { DEFAULT_DIR_DOWNLOADED_TYPES, DEFAULT_DIR_EMITTED_TYPES } from '../constants';
import { downloadTypes } from '../downloadTypes/downloadTypes';
import type { ModuleFederationPluginOptions, ModuleFederationTypesPluginOptions } from '../models';
import { ModuleFederationTypesPlugin } from '../plugin';

vi.mock('../downloadTypes/downloadTypes');

const mockDownloadTypes = vi.mocked(downloadTypes);
const mockAfterEmit = vi.fn();
const { ModuleFederationPlugin } = webpack.container;

const mockLogger = {
  log: vi.fn() as Compilation['logger']['log'],
  info: vi.fn() as Compilation['logger']['info'],
  warn: vi.fn() as Compilation['logger']['warn'],
  error: vi.fn() as Compilation['logger']['error'],
} as Compilation['logger'];

function installPlugin(
  moduleFederationPluginOptions?: ModuleFederationPluginOptions,
  typesPluginOptions?: ModuleFederationTypesPluginOptions,
): ModuleFederationTypesPlugin {
  const pluginInstance = new ModuleFederationTypesPlugin(typesPluginOptions);

  pluginInstance.apply({
    getInfrastructureLogger: vi
      .fn()
      .mockReturnValue(mockLogger) as Compiler['infrastructureLogger'],
    options: {
      plugins: [new ModuleFederationPlugin(moduleFederationPluginOptions || {})],
    },
    hooks: {
      afterEmit: {
        tap: mockAfterEmit as unknown,
      },
      beforeRun: {
        tapPromise: (_, callback) => callback({} as Compiler) as unknown,
      },
      watchRun: {
        tap: (_, callback) => callback({} as Compiler) as unknown,
      },
    },
  } as Compiler);

  return pluginInstance;
}

describe('ModuleFederationTypesPlugin', () => {
  test('does nothing when options are not provided to the ModuleFederationPlugin', () => {
    installPlugin();
    expect(mockAfterEmit).not.toHaveBeenCalled();
  });

  test('remoteManifestUrls setting initiates download of remote entry manifest files on startup', () => {
    const moduleFederationPluginOptions = {
      name: 'mfeDashboard',
      remotes: {
        mfeOther: 'mfeOther@[mfeOtherUrl]/remoteEntry.js',
        mfeTranslations: 'mfeTranslations@[mfeTranslationsUrl]/remoteEntry.js',
      },
    };
    const typesPluginOptions: ModuleFederationTypesPluginOptions = {
      remoteEntryUrls: {
        mfeApp: 'https://artifacts.example.com/mfe-app',
      },
      remoteManifestUrls: {
        mfeOther: 'https://example.com/some-mfe-remote-entry.json',
        registry: 'https://example.com/remote-entries.json',
      },
    };
    installPlugin(moduleFederationPluginOptions, typesPluginOptions);

    expect(mockDownloadTypes).toHaveBeenCalledWith(
      DEFAULT_DIR_EMITTED_TYPES,
      DEFAULT_DIR_DOWNLOADED_TYPES,
      moduleFederationPluginOptions.remotes,
      typesPluginOptions.remoteEntryUrls,
      typesPluginOptions.remoteManifestUrls,
    );
  });
});
