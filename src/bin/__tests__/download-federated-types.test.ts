import * as fs from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_DIR_DOWNLOADED_TYPES, DEFAULT_DIR_EMITTED_TYPES } from '../../constants';
import { downloadTypes, getRemoteManifestUrls } from '../../downloadTypes';
import { getOptionsFromWebpackConfig } from '../helpers/getOptionsFromWebpackConfig';

vi.mock('node:fs', async () => ({
  ...(await vi.importActual<typeof fs>('node:fs')),
  existsSync: vi.fn(),
}));

vi.mock('minimist', () => ({
  default: (args: string[]) => {
    const webpackConfigIndex = args.findIndex(arg => arg === '--webpack-config');
    return webpackConfigIndex > -1 ? { 'webpack-config': args[webpackConfigIndex + 1] } : {};
  },
}));

vi.mock('../../downloadTypes', () => ({
  downloadTypes: vi.fn(),
  getRemoteManifestUrls: vi.fn(),
}));
vi.mock('../helpers/assertRunningFromRoot');
vi.mock('../helpers/getOptionsFromWebpackConfig');

const mockDownloadTypes = vi.mocked(downloadTypes);
const mockGetOptionsFromWebpackConfig = vi.mocked(getOptionsFromWebpackConfig);
const mockGetRemoteManifestUrls = vi.mocked(getRemoteManifestUrls);

const validOptions: ReturnType<typeof getOptionsFromWebpackConfig> = {
  mfPluginOptions: {
    remotes: {
      app1: 'app1@https://app1-url/remoteEntry.js',
      app2: 'app1@https://app2-url/remoteEntry.js',
    },
  },
  mfTypesPluginOptions: {
    remoteEntryUrls: { url1: 'http://valid-url' },
    dirDownloadedTypes: 'custom-dist/types',
    dirEmittedTypes: 'src/@wmf-types/types',
  },
};

describe('download-federated-types', () => {
  const originalArgv = process.argv;
  const originalProcessExit = process.exit;
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exit = vi.fn() as never;

  beforeEach(() => {
    process.argv = ['node', 'download-federated-types'];

    mockGetRemoteManifestUrls.mockReturnValue({});
    mockGetOptionsFromWebpackConfig.mockReturnValue({
      mfPluginOptions: {},
      mfTypesPluginOptions: {},
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.resetModules();
  });

  afterAll(() => {
    process.exit = originalProcessExit;
  });

  test('exits when remote URL is invalid', async () => {
    const remoteEntryUrls = { url1: 'invalid-url' };
    vi.spyOn(fs, 'existsSync').mockImplementation(() => true);
    mockGetOptionsFromWebpackConfig.mockReturnValue({
      mfPluginOptions: {},
      mfTypesPluginOptions: {
        remoteEntryUrls,
      },
    });

    await import('../download-federated-types');

    expect(mockGetOptionsFromWebpackConfig).toHaveBeenCalledWith('webpack.config.ts');
    expect(mockConsoleError).toHaveBeenCalledWith(
      'One or more remote URLs are invalid:',
      remoteEntryUrls,
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits when remote manifest URL is invalid', async () => {
    const manifestUrls = { url1: 'invalid-url' };
    mockGetRemoteManifestUrls.mockReturnValue(manifestUrls);

    await import('../download-federated-types');

    expect(mockGetRemoteManifestUrls).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'One or more remote manifest URLs are invalid:',
      manifestUrls,
    );
  });

  test('calls downloadTypes with correct arguments and logs success on valid URLs', async () => {
    const manifestUrls = { url1: 'https://manifest-registry' };
    mockGetRemoteManifestUrls.mockReturnValue(manifestUrls);
    mockGetOptionsFromWebpackConfig.mockReturnValue(validOptions);

    await import('../download-federated-types');

    expect(mockDownloadTypes).toHaveBeenCalledWith(
      validOptions.mfTypesPluginOptions.dirEmittedTypes,
      validOptions.mfTypesPluginOptions.dirDownloadedTypes,
      validOptions.mfPluginOptions.remotes,
      validOptions.mfTypesPluginOptions.remoteEntryUrls,
      manifestUrls,
    );
    expect(mockConsoleLog).toHaveBeenCalledWith('Successfully downloaded federated types.');
  });

  test('exits with error when downloadTypes throws an error', async () => {
    mockDownloadTypes.mockRejectedValue(new Error('Error downloading types'));

    await import('../download-federated-types');

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error downloading federated types:',
      expect.any(Error),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('uses default directories when mfTypesPluginOptions does not provide them', async () => {
    await import('../download-federated-types');

    expect(mockDownloadTypes).toHaveBeenCalledWith(
      DEFAULT_DIR_EMITTED_TYPES,
      DEFAULT_DIR_DOWNLOADED_TYPES,
      undefined,
      undefined,
      {},
    );
  });

  test('parses argv and uses custom webpack config path', async () => {
    process.argv[2] = '--webpack-config';
    process.argv[3] = 'custom/webpack.config.ts';

    await import('../download-federated-types');

    expect(mockGetOptionsFromWebpackConfig).toHaveBeenCalledWith('custom/webpack.config.ts');
  });
});
