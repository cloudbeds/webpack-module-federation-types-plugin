import fs from 'node:fs';
import path from 'node:path';

import download from 'download';
import { mkdirp } from 'mkdirp';

import { SHARED_DEPS_FILE } from '../../constants';
import { getLogger } from '../../helpers';
import type { SharedDepsManifest } from '../../models';

import { downloadOptions } from './downloadOptions';

/**
 * Fetches a remote's `shared-deps.json` and stores it next to its downloaded `index.d.ts`.
 * A remote built before it emitted the file has none to fetch; that resolves to `undefined`
 * and removes any stale copy, so every other error is a real download failure.
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
    if ((error as { statusCode?: number })?.statusCode === 404) {
      logger.log(`${remoteName} publishes no ${SHARED_DEPS_FILE}, skipping shared versions check`);
      fs.rmSync(outFile, { force: true });
      return undefined;
    }
    throw error;
  }

  const manifest = JSON.parse(content) as SharedDepsManifest;

  mkdirp.sync(outDir);
  if (!fs.existsSync(outFile) || fs.readFileSync(outFile).toString() !== content) {
    logger.log('Downloaded shared versions from', sharedDepsUrl);
    fs.writeFileSync(outFile, content);
  }

  return manifest;
}
