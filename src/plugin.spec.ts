import webpack, { Compiler } from 'webpack';

import { ModuleFederationTypesPlugin } from './plugin';
import { downloadTypes } from './helpers';
import { ModuleFederationPluginOptions, ModuleFederationTypesPluginOptions } from './types';
import { DIR_DIST } from './constants';

jest.mock('./helpers/downloadTypes');

const mockDownloadTypes = downloadTypes as jest.MockedFunction<typeof downloadTypes>;
const mockWatchRun = jest.fn();
const mockAfterEmit = jest.fn();
const { ModuleFederationPlugin } = webpack.container;

function installPlugin(
  moduleFederationPluginOptions: ModuleFederationPluginOptions = {},
  typesPluginOptions?: ModuleFederationTypesPluginOptions
): ModuleFederationTypesPlugin {
  const pluginInstance = new ModuleFederationTypesPlugin(typesPluginOptions);

  pluginInstance.apply({
    getInfrastructureLogger: jest.fn() as Compiler['infrastructureLogger'],
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

  test('remoteManifestUrls setting initiates download of remote entry configs', () => {
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

    mockWatchRun.mock.calls[0][1]();
    expect(mockDownloadTypes.mock.calls[0]).toEqual([
      DIR_DIST,
      moduleFederationPluginOptions.remotes,
      typesPluginOptions.remoteManifestUrls,
    ]);
  });
});
