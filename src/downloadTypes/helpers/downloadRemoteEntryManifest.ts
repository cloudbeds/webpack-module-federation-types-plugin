import download from 'download';

import { getLogger } from '../../helpers';

import { downloadOptions } from './downloadOptions';

export async function downloadRemoteEntryManifest(url: string): Promise<unknown> {
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
