import {
  CloudbedsCloudfrontDomain,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
} from '../constants';
import { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../types';
import { isValidUrl } from './validation';

export function getRemoteManifestUrls(options?: ModuleFederationTypesPluginOptions): RemoteManifestUrls | undefined {
  if (options?.cloudbedsRemoteManifestsBaseUrl !== undefined) {
    let artifactsBaseUrl = '';
    let manifestBaseUrl = options.cloudbedsRemoteManifestsBaseUrl;

    if (!isValidUrl(manifestBaseUrl)) {
      if (['stage', 'stage-ga'].includes(manifestBaseUrl)) {
        artifactsBaseUrl = `${CloudbedsCloudfrontDomain.Stage}/builds`;
        manifestBaseUrl = `${CloudbedsCloudfrontDomain.Stage}/remotes/stage-ga/{version}`;
      } else if (['prod', 'prod-ga'].includes(manifestBaseUrl)) {
        artifactsBaseUrl = `${CloudbedsCloudfrontDomain.Prod}/builds`;
        manifestBaseUrl = `${CloudbedsCloudfrontDomain.Prod}/remotes/prod-ga/{version}`;
      } else {
        artifactsBaseUrl = CloudbedsCloudfrontDomain.Dev;
        manifestBaseUrl = `${CloudbedsCloudfrontDomain.Dev}/remotes/dev-ga`;
      }
    }

    return {
      artifactsBaseUrl,
      registry: `${manifestBaseUrl}/${CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME}`,
      ...options?.remoteManifestUrls,
    }
  }

  if (options?.remoteManifestUrl) {
    return {
      ...options?.remoteManifestUrls,
      registry: options?.remoteManifestUrl,
    }
  }

  return undefined;
}
