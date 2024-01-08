import {
  getLogger, isValidUrl, toCamelCase,
} from '../../helpers';
import {
  RemoteEntryUrls, RemoteManifest, RemoteManifestUrls, RemotesRegistryManifest,
} from '../../models';

import { downloadRemoteEntryManifest } from './downloadRemoteEntryManifest';

/**
 * Download remote entry manifest file(s)
 * The origin of a remote entry URL is used as base URL for type definitions
 */
export async function downloadRemoteEntryURLsFromManifests(remoteManifestUrls?: RemoteManifestUrls)
  : Promise<RemoteEntryUrls> {
  if (!remoteManifestUrls) {
    return {};
  }

  const logger = getLogger();
  const remoteEntryURLs: RemoteEntryUrls = {};

  logger.log('Remote manifest URLs', remoteManifestUrls);

  const { artifactsBaseUrl, ...manifestUrls } = remoteManifestUrls;

  const remoteManifests = (await Promise.all(
    Object.values(manifestUrls).map(url => downloadRemoteEntryManifest(url)),
  )) as (RemoteManifest | RemotesRegistryManifest | RemoteEntryUrls)[];

  // Combine remote entry URLs from all manifests
  Object.keys(manifestUrls).forEach((remoteName, index) => {
    if (remoteName === 'registry') {
      const remotesManifest = remoteManifests[index];
      if (Array.isArray(remotesManifest)) {
        (remoteManifests[index] as RemotesRegistryManifest).forEach(remoteManifest => {
          remoteEntryURLs[remoteManifest.scope] = remoteManifest.url;
        });
      } else {
        Object.entries(remotesManifest as RemoteEntryUrls).forEach(([appName, url]) => {
          remoteEntryURLs[toCamelCase(appName)] = isValidUrl(url) ? url : `${artifactsBaseUrl}/${appName}/${url}`;
        });
      }
    } else {
      remoteEntryURLs[remoteName] = (remoteManifests[index] as RemoteManifest).url;
    }
  });

  logger.log('Remote entry URLs', remoteEntryURLs);

  return remoteEntryURLs;
}
