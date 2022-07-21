import download from 'download';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import { DIR_DOWNLOADED, DIR_EMITTED } from '../constants';
import { RemoteManifest, RemoteManifestUrls, RemotesRegistryManifest } from '../types';

import { getLogger } from './logger';

const downloadOptions: download.DownloadOptions = { rejectUnauthorized: false };

async function downloadRemoteEntryManifest(url: string): Promise<unknown> {
  const json = (await download(url, downloadOptions)).toString();
  return JSON.parse(json);
}

async function downloadRemoteEntryTypes(dtsUrl: string): Promise<void> {
  const logger = getLogger();
  const types = (await download(dtsUrl, downloadOptions)).toString();
  const outFile = path.join(DIR_DOWNLOADED, path.basename(dtsUrl));
  let shouldWriteFile = true;

  // Prevent webpack from recompiling the bundle by not writing the file if it has not changed
  if (fs.existsSync(outFile)) {
    const typesFormer = fs.readFileSync(outFile).toString();
    shouldWriteFile = typesFormer !== types;
  }

  if (shouldWriteFile) {
    logger.log('Writing', outFile);
    fs.writeFileSync(outFile, types);
  } else {
    logger.log('Skipping', outFile);
  }
}

/**
 * Download remote entry manifest files (a.k.a. remote entry configs)
 * The origin of these URLs is used as base URL to download type definitions
 */
export async function downloadRemoteEntryURLsFromManifests(remoteManifestUrls?: RemoteManifestUrls)
  : Promise<Record<string, string>> {
  if (!remoteManifestUrls) { return {}; }

  const logger = getLogger();
  const remoteEntryURLs: Record<string, string> = {};

  logger.log('Remote manifest URLs', remoteManifestUrls);

  const remoteManifests = (await Promise.all(
    Object.values(remoteManifestUrls).map(url => downloadRemoteEntryManifest(url))
  )) as (RemoteManifest | RemotesRegistryManifest)[];

  Object.keys(remoteManifestUrls).forEach((remoteName, index) => {
    if (remoteName === 'registry') {
      (remoteManifests[index] as RemotesRegistryManifest).forEach((remoteManifest) => {
        remoteEntryURLs[remoteManifest.scope] = remoteManifest.url;
      });
    } else {
      remoteEntryURLs[remoteName] = (remoteManifests[index] as RemoteManifest).url;
    }
  });

  logger.log('Remote entry URLs', remoteEntryURLs);

  return remoteEntryURLs;
}

export async function downloadTypes(
  remotes: Record<string, string>,
  remoteManifestUrls?: RemoteManifestUrls,
): Promise<void> {
  const logger = getLogger();
  let remoteEntryURLs: Record<string, string>;

  try {
    remoteEntryURLs = await downloadRemoteEntryURLsFromManifests(remoteManifestUrls);
  } catch (err) {
    logger.warn('Failed to load remote manifest file: ', (err as Dict)?.url);
    logger.log(err)
    return;
  }

  const promises: Promise<void>[] = [];
  mkdirp.sync(DIR_DOWNLOADED);

  Object.entries(remotes).forEach(([remoteName, remoteLocation]) => {
    try {
      const remoteEntryUrl = remoteEntryURLs[remoteName] || remoteLocation.split('@')[1];
      const remoteEntryBaseUrl = remoteEntryUrl.split('/').slice(0, -1).join('/');

      promises.push(downloadRemoteEntryTypes(`${remoteEntryBaseUrl}/${DIR_EMITTED}/${remoteName}.d.ts`));
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
