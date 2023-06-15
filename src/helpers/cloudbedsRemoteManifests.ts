import {
  CloudbedsCloudfrontDomain,
  CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
  CloudbedsMicrofrontend,
} from '../constants';
import { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../types';

export function getRemoteManifestUrls(options?: ModuleFederationTypesPluginOptions): RemoteManifestUrls | undefined {
  if (options?.cloudbedsRemoteManifestsBaseUrl !== undefined) {
    let baseUrl = options?.cloudbedsRemoteManifestsBaseUrl;
    if (!baseUrl || ['use-domain-name', 'dev', 'dev-ga'].includes(baseUrl)) {
      baseUrl = `${CloudbedsCloudfrontDomain.Dev}/remotes/dev-ga`;
    } else if (['stage', 'stage-ga'].includes(baseUrl)) {
      baseUrl = `${CloudbedsCloudfrontDomain.Stage}/remotes/stage-ga/{version}`;
    } else if (['prod', 'prod-ga'].includes(baseUrl)) {
      baseUrl = `${CloudbedsCloudfrontDomain.Prod}/remotes/prod-ga/{version}`;
    }

    return {
      /** @deprecated */
      [CloudbedsMicrofrontend.Common]: `${baseUrl}/${CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME}`,
      registry: `${baseUrl}/${CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME}`,
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
