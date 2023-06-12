import {
  CLOUDBEDS_DEV_FRONTEND_ASSETS_DOMAIN,
  CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
  CloudbedsMicrofrontend,
} from '../constants';
import { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../types';

export function getRemoteManifestUrls(options?: ModuleFederationTypesPluginOptions): RemoteManifestUrls | undefined {
  if (options?.cloudbedsRemoteManifestsBaseUrl !== undefined) {
    let baseUrl = options?.cloudbedsRemoteManifestsBaseUrl;
    if (!baseUrl || baseUrl === 'use-domain-name' || baseUrl === 'dev-ga') {
      baseUrl = `${CLOUDBEDS_DEV_FRONTEND_ASSETS_DOMAIN}/remotes/dev-ga`;
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
