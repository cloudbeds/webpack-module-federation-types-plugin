import { afterEach, describe, expect, test, vi } from 'vitest';

import { setLogger } from '../../helpers';
import { downloadTypes } from '../downloadTypes';
import { downloadRemoteEntryTypes, downloadRemoteEntryURLsFromManifests } from '../helpers';

vi.mock('../helpers', async () => ({
  ...(await vi.importActual<typeof import('../helpers')>('../helpers')),
  downloadRemoteEntryTypes: vi.fn(),
  downloadRemoteEntryURLsFromManifests: vi.fn().mockResolvedValue({}),
}));

const mockDownloadRemoteEntryTypes = vi.mocked(downloadRemoteEntryTypes);
const mockDownloadRemoteEntryURLsFromManifests = vi.mocked(downloadRemoteEntryURLsFromManifests);

const dirEmittedTypes = 'dist/@types';
const dirDownloadedTypes = 'src/@types/remotes';

const mockLogger = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
setLogger(mockLogger);

describe('downloadTypes', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('handles successful download', async () => {
    const remotesFromConfig = {
      mfdApp1: 'mfdApp1@[mfdApp1Url]/remoteEntry.js',
      mfdApp2: 'mfdApp2@[mfdApp2Url]/remoteEntry.js',
    };
    const remoteEntryBaseUrl = 'http://example.com';
    const remoteEntryUrls = { mfdApp2: `${remoteEntryBaseUrl}/remoteEntry.js` };
    const remoteManifestUrls = { registry: 'http://example.com/remote-entries.json' };

    mockDownloadRemoteEntryURLsFromManifests.mockResolvedValue({});
    mockDownloadRemoteEntryTypes.mockResolvedValue();

    const result = await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
      remoteManifestUrls,
    );

    expect(result).toEqual({ downloaded: ['mfdApp1', 'mfdApp2'], failed: [] });
    expect(mockDownloadRemoteEntryURLsFromManifests).toHaveBeenCalledWith(remoteManifestUrls);
    expect(mockDownloadRemoteEntryTypes).toHaveBeenCalledWith(
      'mfdApp1',
      remotesFromConfig.mfdApp1,
      `[mfdApp1Url]/${dirEmittedTypes}/index.d.ts`,
      dirDownloadedTypes,
    );
    expect(mockDownloadRemoteEntryTypes).toHaveBeenCalledWith(
      'mfdApp2',
      remotesFromConfig.mfdApp2,
      `${remoteEntryBaseUrl}/${dirEmittedTypes}/index.d.ts`,
      dirDownloadedTypes,
    );
  });

  test('handles invalid remote URLs', async () => {
    const remotesFromConfig = { mfdExample: 'mfdApp1@https://example.com/remoteEntry.js' };
    const remoteManifestUrls = { mfdExample: 'invalid-url' };
    const error = new Error('Invalid URL');
    (error as unknown as Dict).url = 'invalid-url';

    mockDownloadRemoteEntryURLsFromManifests.mockRejectedValue(error);

    const result = await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      undefined,
      remoteManifestUrls,
    );

    expect(result.manifestError).toEqual({ url: 'invalid-url', error });
    expect(result.downloaded).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to load remote manifest file:',
      'invalid-url',
    );
    expect(mockLogger.log).toHaveBeenCalledWith(error);
  });

  test('handles download function failure', async () => {
    const remoteName = 'mfdExample';
    const remotesFromConfig = { [remoteName]: 'mfdExample@https://example.com/remoteEntry.js' };
    const remoteEntryUrls = { [remoteName]: 'http://example.com/remoteEntry.js' };
    const error = new Error('Download failed');

    mockDownloadRemoteEntryTypes.mockImplementationOnce(() => {
      throw error;
    });

    const result = await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
    );

    expect(result.downloaded).toEqual([]);
    expect(result.failed).toEqual([
      { remoteName, remoteLocation: remotesFromConfig[remoteName], error },
    ]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      `${remoteName}: '${remotesFromConfig[remoteName]}' is not a valid remote federated module URL`,
    );
    expect(mockLogger.log).toHaveBeenCalledWith(error);
  });

  test('handles download failure', async () => {
    const remoteName = 'mfdExample';
    const remotesFromConfig = { [remoteName]: 'mfdExample@https://example.com/remoteEntry.js' };
    const remoteEntryUrls = { [remoteName]: 'http://example.com/remoteEntry.js' };
    const error = new Error('Download failed');
    (error as unknown as Dict).url = 'invalid-url';

    mockDownloadRemoteEntryTypes.mockRejectedValue(error);

    const result = await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
    );

    expect(result.downloaded).toEqual([]);
    expect(result.failed).toEqual([
      {
        remoteName,
        remoteLocation: remotesFromConfig[remoteName],
        url: 'invalid-url',
        error,
      },
    ]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to load remote types from:',
      'invalid-url',
    );
    expect(mockLogger.log).toHaveBeenCalledWith(error);
  });

  test('keeps each remote with its own outcome when the failure modes differ', async () => {
    const remotesFromConfig = {
      mfdBadUrl: 'mfdBadUrl',
      mfdOk: 'mfdOk@https://ok.example.com/remoteEntry.js',
      mfdNotFound: 'mfdNotFound@https://missing.example.com/remoteEntry.js',
    };
    const downloadError = new Error('Response code 404 (Not Found)');

    mockDownloadRemoteEntryURLsFromManifests.mockResolvedValue({});
    mockDownloadRemoteEntryTypes.mockImplementation(async remoteName => {
      if (remoteName === 'mfdNotFound') {
        throw downloadError;
      }
    });

    const result = await downloadTypes(dirEmittedTypes, dirDownloadedTypes, remotesFromConfig);

    expect(result.downloaded).toEqual(['mfdOk']);
    expect(result.failed).toEqual([
      {
        remoteName: 'mfdBadUrl',
        remoteLocation: remotesFromConfig.mfdBadUrl,
        error: expect.objectContaining({
          message: "'mfdBadUrl' carries no @<url> half, and no remote entry URL is known",
        }),
      },
      {
        remoteName: 'mfdNotFound',
        remoteLocation: remotesFromConfig.mfdNotFound,
        url: `https://missing.example.com/${dirEmittedTypes}/index.d.ts`,
        error: downloadError,
      },
    ]);
  });

  test('reports every remote when one fails and another succeeds', async () => {
    const remotesFromConfig = {
      mfdApp1: 'mfdApp1@https://app1.example.com/remoteEntry.js',
      mfdApp2: 'mfdApp2@https://app2.example.com/remoteEntry.js',
    };
    const error = new Error('Response code 404 (Not Found)');

    mockDownloadRemoteEntryURLsFromManifests.mockResolvedValue({});
    mockDownloadRemoteEntryTypes.mockResolvedValueOnce().mockRejectedValueOnce(error);

    const result = await downloadTypes(dirEmittedTypes, dirDownloadedTypes, remotesFromConfig);

    expect(result.downloaded).toEqual(['mfdApp1']);
    expect(result.failed).toEqual([
      {
        remoteName: 'mfdApp2',
        remoteLocation: remotesFromConfig.mfdApp2,
        url: `https://app2.example.com/${dirEmittedTypes}/index.d.ts`,
        error,
      },
    ]);
  });
});
