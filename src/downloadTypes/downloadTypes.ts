import {
  RemoteEntryUrls, RemoteManifestUrls,
} from '../models';
import { getLogger } from '../helpers';

import {
  downloadRemoteEntryTypes, downloadRemoteEntryURLsFromManifests,
} from './helpers';

export async function downloadTypes(
  dirEmittedTypes: string,
  dirDownloadedTypes: string,
  remotesFromFederationConfig?: Dict<string>,
  remoteEntryUrls?: RemoteEntryUrls,
  remoteManifestUrls?: RemoteManifestUrls,
): Promise<void> {
  const logger = getLogger();
  let remoteEntryUrlsResolved: RemoteEntryUrls = {};

  try {
    remoteEntryUrlsResolved = {
      ...remoteEntryUrls,
      ...await downloadRemoteEntryURLsFromManifests(remoteManifestUrls),
    };
  } catch (err) {
    logger.warn('Failed to load remote manifest file:', (err as Dict)?.url);
    logger.log(err);
    return;
  }

  const promises: Promise<void>[] = [];

  Object.entries(remotesFromFederationConfig || {}).forEach(([remoteName, remoteLocation]) => {
    try {
      const remoteEntryUrl = remoteEntryUrlsResolved[remoteName] || remoteLocation.split('@')[1];

      const remoteEntryBaseUrl = remoteEntryUrl.endsWith('.js')
        ? remoteEntryUrl.split('/').slice(0, -1).join('/')
        : remoteEntryUrl;

      const promiseDownload = downloadRemoteEntryTypes(
        remoteName,
        remoteLocation,
        `${remoteEntryBaseUrl}/${dirEmittedTypes}/index.d.ts`,
        dirDownloadedTypes,
      );

      promises.push(promiseDownload);
    } catch (err) {
      logger.error(`${remoteName}: '${remoteLocation}' is not a valid remote federated module URL`);
      logger.log(err);
    }
  });

  try {
    await Promise.all(promises);
  } catch (err) {
    logger.warn('Failed to load remote types from:', (err as Dict)?.url);
    logger.log(err);
    return;
  }

  return;
}
