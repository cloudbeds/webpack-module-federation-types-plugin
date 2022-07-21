import webpack, { Compilation, Compiler } from 'webpack';

import { downloadTypes } from './helpers/downloadTypes';
import { ModuleFederationTypesPlugin } from './plugin';
import { ModuleFederationPluginOptions, ModuleFederationTypesPluginOptions } from './types';

jest.mock('./helpers/downloadTypes');

const mockDownloadTypes = downloadTypes as jest.MockedFunction<typeof downloadTypes>;
const mockWatchRun = jest.fn();
const mockAfterEmit = jest.fn();
const { ModuleFederationPlugin } = webpack.container;

const mockLogger = {
  log: jest.fn() as Compilation['logger']['log'],
  info: jest.fn() as Compilation['logger']['info'],
  warn: jest.fn() as Compilation['logger']['warn'],
  error: jest.fn() as Compilation['logger']['error'],
} as Compilation['logger'];

function installPlugin(
  moduleFederationPluginOptions: ModuleFederationPluginOptions = {},
  typesPluginOptions?: ModuleFederationTypesPluginOptions
): ModuleFederationTypesPlugin {
  const pluginInstance = new ModuleFederationTypesPlugin(typesPluginOptions);

  pluginInstance.apply({
    getInfrastructureLogger: jest.fn().mockReturnValue(mockLogger) as Compiler['infrastructureLogger'],
    options: {
      plugins: [
        new ModuleFederationPlugin(moduleFederationPluginOptions),
      ],
    },
    hooks: {
      watchRun: {
        tapPromise: mockWatchRun as unknown,
      },
      afterEmit: {
        tap: mockAfterEmit as unknown,
      },
    },
  } as Compiler);

  return pluginInstance;
}

describe('ModuleFederationTypesPlugin', () => {
  test('does nothing by default', () => {
    installPlugin();
    expect(mockWatchRun).not.toBeCalled();
  });

  test('remoteManifestUrls setting initiates download of remote entry manifest files on startup', () => {
    const moduleFederationPluginOptions = {
      name: 'mfdCommon',
      remotes: {
        mfdCommon: 'mfdCommon@[mfdCommon]/remoteEntry.js',
        mfdTranslations: 'mfdTranslations@[mfdTranslations]/remoteEntry.js',
      }
    };
    const typesPluginOptions = {
      remoteManifestUrls: {
        mfdCommon: 'https://example.com/mfd-common-remote-entries.json',
        registry: 'https://example.com/remote-entries.json',
      }
    };
    installPlugin(moduleFederationPluginOptions, typesPluginOptions);

    expect(mockDownloadTypes.mock.calls[0]).toEqual([
      moduleFederationPluginOptions.remotes,
      typesPluginOptions.remoteManifestUrls,
    ]);
  });
});