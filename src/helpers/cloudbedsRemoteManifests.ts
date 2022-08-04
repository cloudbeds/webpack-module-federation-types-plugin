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
    if (!baseUrl || baseUrl === 'use-domain-name') {
      baseUrl = `${CLOUDBEDS_DEV_FRONTEND_ASSETS_DOMAIN}/remotes/dev-ga`;
    }
    return {
      [CloudbedsMicrofrontend.Common]: `${baseUrl}/${CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME}`,
      registry: `${baseUrl}/${CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME}`,
      ...options?.remoteManifestUrls,
    }
  }

  return options?.remoteManifestUrls;
}
