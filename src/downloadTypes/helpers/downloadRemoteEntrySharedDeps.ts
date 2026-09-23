import fs from 'node:fs';
import path from 'node:path';

import download from 'download';
import { mkdirp } from 'mkdirp';

import { SHARED_DEPS_FILE } from '../../constants';
import { getLogger } from '../../helpers';
import type { SharedDepsManifest } from '../../models';

import { downloadOptions } from './downloadOptions';

// S3-backed CDNs answer a missing object with 403 unless the bucket allows ListBucket
const NOT_PUBLISHED_STATUS_CODES = [403, 404];

/**
 * Fetches a remote's `shared-deps.json` and stores it next to its downloaded `index.d.ts`.
 * The manifest is optional metadata, so no failure here fails the remote: a remote that
 * publishes none resolves to `undefined` (removing any stale copy) and any other fetch
 * error is logged and skipped.
 */
export async function downloadRemoteEntrySharedDeps(
  remoteName: string,
  sharedDepsUrl: string,
  dirDownloadedTypes: string,
): Promise<SharedDepsManifest | undefined> {
  const logger = getLogger();
  const outDir = path.join(dirDownloadedTypes, remoteName);
  const outFile = path.join(outDir, SHARED_DEPS_FILE);

  let content: string;
  try {
    content = (await download(sharedDepsUrl, downloadOptions)).toString();
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode && NOT_PUBLISHED_STATUS_CODES.includes(statusCode)) {
      logger.log(`${remoteName} publishes no ${SHARED_DEPS_FILE}, skipping shared versions check`);
      fs.rmSync(outFile, { force: true });
      return undefined;
    }
    logger.warn('Failed to load remote shared versions from:', sharedDepsUrl);
    logger.log(error);
    return undefined;
  }

  let manifest: SharedDepsManifest;
  try {
    manifest = JSON.parse(content) as SharedDepsManifest;
  } catch (error) {
    logger.warn('Ignoring malformed remote shared versions from:', sharedDepsUrl);
    logger.log(error);
    return undefined;
  }

  mkdirp.sync(outDir);
  if (!fs.existsSync(outFile) || fs.readFileSync(outFile).toString() !== content) {
    logger.log('Downloaded shared versions from', sharedDepsUrl);
    fs.writeFileSync(outFile, content);
  }

  return manifest;
}
