import {
  CloudbedsCloudfrontDomain,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
} from '../constants';
import { isValidUrl } from '../helpers';
import {
  ModuleFederationTypesPluginOptions, RemoteManifestUrls,
} from '../models';

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
        artifactsBaseUrl = `${CloudbedsCloudfrontDomain.Dev}/branches`;
        manifestBaseUrl = `${CloudbedsCloudfrontDomain.Dev}/remotes/dev-ga`;
      }
    }

    return {
      ...(artifactsBaseUrl ? { artifactsBaseUrl } : null),
      registry: `${manifestBaseUrl}/${CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME}`,
      ...options?.remoteManifestUrls,
    };
  }

  if (options?.remoteManifestUrl) {
    return {
      ...options?.remoteManifestUrls,
      registry: options?.remoteManifestUrl,
    };
  }

  return options?.remoteManifestUrls;
}
