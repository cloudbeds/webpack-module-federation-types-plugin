import download from 'download';
import mkdirp from 'mkdirp';
import path from 'path';

import { DIR_DOWNLOADED, DIR_EMITTED } from '../constants';
import { RemoteManifest, RemoteManifestUrls, RemotesRegistryManifest } from '../types';

const downloadOptions: download.DownloadOptions = { rejectUnauthorized: false };

async function downloadRemoteEntryConfig(url: string): Promise<unknown> {
  const json = (await download(url, downloadOptions)).toString();
  return JSON.parse(json);
}

export async function downloadRemoteEntryURLsFromManifests(remoteManifestUrls?: RemoteManifestUrls)
  : Promise<Record<string, string>> {
  if (!remoteManifestUrls) { return {}; }

  const remoteEntryURLs: Record<string, string> = {};

  const remoteManifests = (await Promise.all(
    Object.values(remoteManifestUrls).map(url => downloadRemoteEntryConfig(url))
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

  console.info('<i> Remote entry URLs:', remoteEntryURLs);

  return remoteEntryURLs;
}

export async function downloadTypes(
  distPath: string,
  remotes: Record<string, string>,
  remoteManifestUrls?: RemoteManifestUrls,
): Promise<void> {
  let remoteEntryURLs: Record<string, string>;
  try {
    remoteEntryURLs = await downloadRemoteEntryURLsFromManifests(remoteManifestUrls);
  } catch (err) {
    console.error('WARNING! Manifest URLs were not loaded: ', remoteManifestUrls)
    return;
  }

  const promises: Promise<Buffer>[] = [];
  mkdirp.sync(path.join(distPath, DIR_EMITTED));

  Object.entries(remotes).forEach(([remoteName, remoteLocation]) => {
    try {
      const remoteDistUrl = new URL(remoteEntryURLs[remoteName] || remoteLocation.split('@')[1]).origin;

      promises.push(
        download(`${remoteDistUrl}/${DIR_EMITTED}/${remoteName}.d.ts`, DIR_DOWNLOADED, downloadOptions),
      );
    } catch (err) {
      console.error(remoteName, remoteLocation, 'is not a valid remote federated module URL');
    }
  });

  await Promise.all(promises);

  return;
}
