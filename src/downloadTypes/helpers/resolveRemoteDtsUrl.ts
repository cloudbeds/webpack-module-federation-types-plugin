import type { RemoteEntryUrls } from '../../models';

/**
 * The URL a remote's emitted `index.d.ts` is served from.
 *
 * Throws when no entry URL can be resolved for the remote. The message reaches the CLI's
 * per-remote failure line, so it states what is wrong with the entry.
 */
export function resolveRemoteDtsUrl(
  remoteName: string,
  remoteLocation: string,
  remoteEntryUrls: RemoteEntryUrls,
  dirEmittedTypes: string,
): string {
  const remoteEntryUrl = remoteEntryUrls[remoteName] || remoteLocation.split('@')[1];

  if (!remoteEntryUrl) {
    throw new Error(`'${remoteLocation}' carries no @<url> half, and no remote entry URL is known`);
  }

  const remoteEntryBaseUrl = remoteEntryUrl.endsWith('.js')
    ? remoteEntryUrl.split('/').slice(0, -1).join('/')
    : remoteEntryUrl;

  return `${remoteEntryBaseUrl}/${dirEmittedTypes}/index.d.ts`;
}
