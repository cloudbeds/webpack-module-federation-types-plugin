export type DownloadTypesFailure = {
  remoteName: string;
  remoteLocation: string;
  /** The `.d.ts` URL that was attempted, absent when the remote's URL could not be built at all. */
  url?: string;
  error: unknown;
};

export type DownloadTypesManifestError = {
  url?: string;
  error: unknown;
};

export type DownloadTypesResult = {
  /** Names of the remotes whose types were fetched and written. */
  downloaded: string[];
  failed: DownloadTypesFailure[];
  /** Set when the remote manifest could not be read, in which case no remote was attempted. */
  manifestError?: DownloadTypesManifestError;
};
