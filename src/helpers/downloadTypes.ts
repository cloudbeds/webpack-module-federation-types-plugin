import download from 'download';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import { RemoteManifest, RemoteManifestUrls, RemotesRegistryManifest, RemoteEntryUrls } from '../types';

import { getLogger } from './logger';
import { toCamelCase } from './toCamelCase';
import { isValidUrl } from './validation';

const downloadOptions: download.DownloadOptions = { rejectUnauthorized: false };

async function downloadRemoteEntryManifest(url: string): Promise<unknown> {
  const logger = getLogger();

  if (url.includes('{version}')) {
    const versionJsonUrl = `${url.match(/^https:\/\/[^/]+/)}/version.json`;
    const { version } = JSON.parse((await download(versionJsonUrl, downloadOptions)).toString());
    url = url.replace('{version}', version);
  }

  logger.log(`Downloading remote manifest from ${url}`);
  const json = (await download(url, downloadOptions)).toString();

  return JSON.parse(json);
}

async function downloadRemoteEntryTypes(
  remoteName: string,
  remoteLocation: string,
  dtsUrl: string,
  dirDownloadedTypes: string,
): Promise<void> {
  const logger = getLogger();
  const remoteOriginalName = remoteLocation.split('@')[0];
  const outDir = path.join(dirDownloadedTypes, remoteName);
  const outFile = path.join(outDir, 'index.d.ts');
  let shouldWriteFile = true;

  mkdirp.sync(outDir);

  let types = (await download(dtsUrl, downloadOptions)).toString();

  // Replace original remote name (as defined in remote microapp's WMF config's `name` field)
  // with a name (an alias) that is used in `remotes` object. Usually these are same.
  if (remoteName !== remoteOriginalName) {
    types = types.replace(
      new RegExp(`declare module "${remoteOriginalName}(.*)"`, 'g'),
      (_, $1) => `declare module "${remoteName}${$1}"`
    );
  }

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
 * Download remote entry manifest file(s)
 * The origin of a remote entry URL is used as base URL for type definitions
 */
export async function downloadRemoteEntryURLsFromManifests(remoteManifestUrls?: RemoteManifestUrls)
  : Promise<RemoteEntryUrls> {
  if (!remoteManifestUrls) { return {}; }

  const logger = getLogger();
  const remoteEntryURLs: RemoteEntryUrls = {};

  /** @deprecated Temporary support */
  let urlMfdCommonManifest = '';

  logger.log('Remote manifest URLs', remoteManifestUrls);

  const { artifactsBaseUrl, ...manifestUrls } = remoteManifestUrls;

  const remoteManifests = (await Promise.all(
    Object.values(manifestUrls).map(url => downloadRemoteEntryManifest(url))
  )) as (RemoteManifest | RemotesRegistryManifest | RemoteEntryUrls)[];

  // Combine remote entry URLs from all manifests
  Object.keys(manifestUrls).forEach((remoteName, index) => {
    if (remoteName === 'registry') {
      const remotesManifest = remoteManifests[index];
      if (Array.isArray(remotesManifest)) {
        urlMfdCommonManifest = manifestUrls[remoteName].replace('remote-entries', 'mfd-common-remote-entry');
        (remoteManifests[index] as RemotesRegistryManifest).forEach((remoteManifest) => {
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

  if (urlMfdCommonManifest) {
    remoteEntryURLs.mfdCommon = ((await downloadRemoteEntryManifest(urlMfdCommonManifest)) as RemoteManifest).url;
  }

  logger.log('Remote entry URLs', remoteEntryURLs);

  return remoteEntryURLs;
}

export async function downloadTypes(
  dirEmittedTypes: string,
  dirDownloadedTypes: string,
  remotesFromFederationConfig: Dict<string>,
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

  Object.entries(remotesFromFederationConfig).forEach(([remoteName, remoteLocation]) => {
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
