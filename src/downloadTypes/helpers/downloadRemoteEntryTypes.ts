import fs from 'node:fs';
import path from 'node:path';

import download from 'download';
import mkdirp from 'mkdirp';

import { getLogger } from '../../helpers';

import { downloadOptions } from './downloadOptions';

export async function downloadRemoteEntryTypes(
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
      new RegExp(`"${remoteOriginalName}(.*)"`, 'g'),
      (_, $1) => `"${remoteName}${$1}"`,
    );
  }

  // Prevent webpack from recompiling the bundle by not writing the file if it has not changed
  if (fs.existsSync(outFile)) {
    const typesFormer = fs.readFileSync(outFile).toString();
    shouldWriteFile = typesFormer !== types;
  }

  if (shouldWriteFile) {
    logger.info('Downloaded types from', dtsUrl);
    logger.info(fs.existsSync(outFile) ? 'Updating' : 'Creating', outFile);
    fs.writeFileSync(outFile, types);
  } else {
    logger.log('Typings have not changed, skipping writing', outFile);
  }
}
