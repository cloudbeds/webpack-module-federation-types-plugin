import { container } from 'webpack';

export type FederationConfig = {
  name: string,
  exposes: Record<string, string>,
}

export type CompileTypesResult = {
  isSuccess: boolean,
  typeDefinitions: string,
};

export type RemoteManifest = {
  [key: string]: unknown,
  url: string,
}

export type RemotesRegistryManifest = {
  [key: string]: unknown,
  scope: string,
  url: string,
}[];

export type RemoteManifestUrls = Record<'registry' | string, string>;

export type ModuleFederationPluginOptions = ConstructorParameters<typeof container.ModuleFederationPlugin>[0];

export type ModuleFederationTypesPluginOptions = {
  cloudbedsRemoteManifestsBaseUrl?: string | 'use-devbox-name',
  disableDownladingRemoteTypes?: boolean,
  disableTypeCompilation?: boolean,
  doNotUseCloudbedsRemoteManifests?: boolean,
  remoteManifestUrls?: RemoteManifestUrls,
  downloadTypesWhenIdleIntervalInSeconds?: number,
}
