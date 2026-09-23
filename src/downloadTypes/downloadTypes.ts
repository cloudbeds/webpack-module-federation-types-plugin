import { DEFAULT_STRICT_SHARED_DEPS } from '../constants';
import { getLogger } from '../helpers';
import type {
  DownloadTypesFailure,
  DownloadTypesResult,
  RemoteEntryUrls,
  RemoteManifestUrls,
  SharedDepsMismatch,
} from '../models';
import { checkSharedDeps, formatSharedDepsMismatch } from '../sharedDeps';

import {
  downloadRemoteEntrySharedDeps,
  downloadRemoteEntryTypes,
  downloadRemoteEntryURLsFromManifests,
  resolveRemoteDtsUrl,
  resolveRemoteSharedDepsUrl,
} from './helpers';

type Settlement = {
  remoteName: string;
  failure?: DownloadTypesFailure;
  sharedDepsMismatches?: SharedDepsMismatch[];
};

export async function downloadTypes(
  dirEmittedTypes: string,
  dirDownloadedTypes: string,
  remotesFromFederationConfig?: Dict<string>,
  remoteEntryUrls?: RemoteEntryUrls,
  remoteManifestUrls?: RemoteManifestUrls,
  strictSharedDeps: string[] = DEFAULT_STRICT_SHARED_DEPS,
): Promise<DownloadTypesResult> {
  const logger = getLogger();
  const result: DownloadTypesResult = { downloaded: [], failed: [], sharedDepsMismatches: [] };
  let remoteEntryUrlsResolved: RemoteEntryUrls = {};

  try {
    remoteEntryUrlsResolved = {
      ...remoteEntryUrls,
      ...(await downloadRemoteEntryURLsFromManifests(remoteManifestUrls)),
    };
  } catch (err) {
    logger.warn('Failed to load remote manifest file:', (err as Dict)?.url);
    logger.log(err);
    result.manifestError = { url: (err as Dict)?.url as string | undefined, error: err };
    return result;
  }

  // Each remote carries its own outcome, so no index correlates one list against another.
  const settlements = await Promise.all(
    Object.entries(remotesFromFederationConfig || {}).map(
      async ([remoteName, remoteLocation]): Promise<Settlement> => {
        let dtsUrl: string;
        let sharedDepsUrl: string;
        let promiseDownload: Promise<void>;

        try {
          dtsUrl = resolveRemoteDtsUrl(
            remoteName,
            remoteLocation,
            remoteEntryUrlsResolved,
            dirEmittedTypes,
          );
          sharedDepsUrl = resolveRemoteSharedDepsUrl(
            remoteName,
            remoteLocation,
            remoteEntryUrlsResolved,
            dirEmittedTypes,
          );
          promiseDownload = downloadRemoteEntryTypes(
            remoteName,
            remoteLocation,
            dtsUrl,
            dirDownloadedTypes,
          );
        } catch (error) {
          logger.error(
            `${remoteName}: '${remoteLocation}' is not a valid remote federated module URL`,
          );
          logger.log(error);
          return { remoteName, failure: { remoteName, remoteLocation, error } };
        }

        try {
          await promiseDownload;
        } catch (error) {
          const url = ((error as Dict)?.url as string | undefined) || dtsUrl;

          logger.warn('Failed to load remote types from:', url);
          logger.log(error);
          return { remoteName, failure: { remoteName, remoteLocation, url, error } };
        }

        try {
          const producerSharedDeps = await downloadRemoteEntrySharedDeps(
            remoteName,
            sharedDepsUrl,
            dirDownloadedTypes,
          );
          const sharedDepsMismatches = producerSharedDeps
            ? checkSharedDeps(remoteName, producerSharedDeps, strictSharedDeps)
            : [];

          sharedDepsMismatches.forEach(mismatch => {
            const message = formatSharedDepsMismatch(mismatch);
            if (mismatch.strict) {
              logger.error(message);
            } else {
              logger.warn(message);
            }
          });

          return { remoteName, sharedDepsMismatches };
        } catch (error) {
          const url = ((error as Dict)?.url as string | undefined) || sharedDepsUrl;

          logger.warn('Failed to load remote shared versions from:', url);
          logger.log(error);
          return { remoteName, failure: { remoteName, remoteLocation, url, error } };
        }
      },
    ),
  );

  settlements.forEach(({ remoteName, failure, sharedDepsMismatches = [] }) => {
    if (failure) {
      result.failed.push(failure);
    } else {
      result.downloaded.push(remoteName);
    }
    result.sharedDepsMismatches.push(...sharedDepsMismatches);
  });

  return result;
}
