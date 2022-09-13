import download from 'download';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import { RemoteManifest, RemoteManifestUrls, RemotesRegistryManifest, RemoteEntryUrls } from '../types';

import { getLogger } from './logger';

const downloadOptions: download.DownloadOptions = { rejectUnauthorized: false };

async function downloadRemoteEntryManifest(url: string): Promise<unknown> {
  const json = (await download(url, downloadOptions)).toString();
  return JSON.parse(json);
}

async function downloadRemoteEntryTypes(remoteName: string, dtsUrl: string, dirDownloadedTypes: string): Promise<void> {
  const logger = getLogger();
  const types = (await download(dtsUrl, downloadOptions)).toString();
  const outDir = path.join(dirDownloadedTypes, remoteName);
  const outFile = path.join(outDir, 'index.d.ts');
  let shouldWriteFile = true;

  mkdirp.sync(outDir);

  // Prevent webpack from recompiling the bundle by not writing the file if it has not changed
  if (fs.existsSync(outFile)) {
    const typesFormer = fs.readFileSync(outFile).toString();
    shouldWriteFile = typesFormer !== types;
  }

  if (shouldWriteFile) {
    logger.info('Downloaded types from', dtsUrl);
    logger.info('Updating', outFile);
    fs.writeFileSync(outFile, types);
  } else {
    logger.log('Typings have not changed, skipping writing', outFile);
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
  dirEmittedTypes: string,
  dirDownloadedTypes: string,
  remotes: Record<string, string>,
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
    logger.warn('Failed to load remote manifest file: ', (err as Dict)?.url);
    logger.log(err)
    return;
  }

  const promises: Promise<void>[] = [];

  Object.entries(remotes).forEach(([remoteName, remoteLocation]) => {
    try {
      const remoteEntryUrl = remoteEntryUrlsResolved[remoteName] || remoteLocation.split('@')[1];
      const remoteEntryBaseUrl = remoteEntryUrl.split('/').slice(0, -1).join('/');
      const promiseDownload = downloadRemoteEntryTypes(
        remoteName,
        `${remoteEntryBaseUrl}/${dirEmittedTypes}/index.d.ts`,
        dirDownloadedTypes,
      )

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
