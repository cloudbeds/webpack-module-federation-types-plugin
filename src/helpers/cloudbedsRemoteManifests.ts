import {
  CloudbedsCloudfrontDomain,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
} from '../constants';
import { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../types';

export function getRemoteManifestUrls(options?: ModuleFederationTypesPluginOptions): RemoteManifestUrls | undefined {
  if (options?.cloudbedsRemoteManifestsBaseUrl !== undefined) {
    let artifactsBaseUrl: string = CloudbedsCloudfrontDomain.Dev as string;
    let manifestBaseUrl = `${CloudbedsCloudfrontDomain.Dev}/remotes/dev-ga`;

    if (['stage', 'stage-ga'].includes(manifestBaseUrl)) {
      artifactsBaseUrl = `${CloudbedsCloudfrontDomain.Stage}/builds`;
      manifestBaseUrl = `${CloudbedsCloudfrontDomain.Stage}/remotes/stage-ga/{version}`;
    } else if (['prod', 'prod-ga'].includes(manifestBaseUrl)) {
      artifactsBaseUrl = `${CloudbedsCloudfrontDomain.Prod}/builds`;
      manifestBaseUrl = `${CloudbedsCloudfrontDomain.Prod}/remotes/prod-ga/{version}`;
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

  return options?.remoteManifestUrls;
}
