import { RemoteEntryUrls } from './RemoteEntryUrls';
import { RemoteManifestUrls } from './RemoteManifestUrls';

export type ModuleFederationTypesPluginOptions = {
  dirEmittedTypes?: string,
  dirGlobalTypes?: string,
  dirDownloadedTypes?: string,

  disableDownladingRemoteTypes?: boolean,
  disableTypeCompilation?: boolean,
  downloadTypesWhenIdleIntervalInSeconds?: number,
  moduleFederationPluginName?: string,
  remoteEntryUrls?: RemoteEntryUrls,
  remoteManifestUrls?: RemoteManifestUrls,
  remoteManifestUrl?: string,
  shouldCompileTypesContinuously?: boolean;
}
