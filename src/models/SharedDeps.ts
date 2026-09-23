/** Installed versions of the shared packages a remote compiled its types against, by package name. */
export type SharedDepsManifest = Dict<string>;

export type SharedDepsMismatch = {
  remoteName: string;
  packageName: string;
  producerVersion: string;
  consumerVersion: string;
  /** A strict package fails the download; the rest only warn. */
  strict: boolean;
};
