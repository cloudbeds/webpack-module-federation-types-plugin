import { setLogger } from '../../helpers';
import { downloadTypes } from '../downloadTypes';
import {
  downloadRemoteEntryTypes, downloadRemoteEntryURLsFromManifests,
} from '../helpers';

jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  downloadRemoteEntryTypes: jest.fn(),
  downloadRemoteEntryURLsFromManifests: jest.fn().mockResolvedValue({}),
}));
const mockDownloadRemoteEntryTypes = downloadRemoteEntryTypes as jest
  .MockedFunction<typeof downloadRemoteEntryTypes>;
const mockDownloadRemoteEntryURLsFromManifests = downloadRemoteEntryURLsFromManifests as jest
  .MockedFunction<typeof downloadRemoteEntryURLsFromManifests>;

const dirEmittedTypes = 'dist/@types';
const dirDownloadedTypes = 'src/@types/remotes';

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
setLogger(mockLogger);

describe('downloadTypes', () => {
  afterEach(() => {
    mockDownloadRemoteEntryURLsFromManifests.mockResolvedValue({});
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

    await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
      remoteManifestUrls,
    );

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

    await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      undefined,
      remoteManifestUrls,
    );

    expect(mockLogger.warn).toHaveBeenCalledWith('Failed to load remote manifest file:', 'invalid-url');
    expect(mockLogger.log).toHaveBeenCalledWith(error);
  });

  test('handles download function failure', async () => {
    const remoteName = 'mfdExample';
    const remotesFromConfig = { [remoteName]: 'mfdExample@https://example.com/remoteEntry.js' };
    const remoteEntryUrls = { [remoteName]: 'http://example.com/remoteEntry.js' };
    const error = new Error('Download failed');

    mockDownloadRemoteEntryTypes.mockImplementationOnce(() => { throw error; });

    await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
    );

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

    await downloadTypes(
      dirEmittedTypes,
      dirDownloadedTypes,
      remotesFromConfig,
      remoteEntryUrls,
    );

    expect(mockLogger.warn).toHaveBeenCalledWith('Failed to load remote types from:', 'invalid-url');
    expect(mockLogger.log).toHaveBeenCalledWith(error);
  });
});
