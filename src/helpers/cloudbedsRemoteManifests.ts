import {
  CLOUDBEDS_DEV_FRONTEND_ASSETS_DOMAIN,
  CLOUDBEDS_DEV_REMOTES_MANIFEST,
  CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME,
  CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME,
} from '../constants';
import { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../types';

export function getRemoteManifestUrls(options?: ModuleFederationTypesPluginOptions): RemoteManifestUrls | undefined {
  let baseUrl = options?.cloudbedsRemoteManifestsBaseUrl;
  if (baseUrl) {
    if (baseUrl === CLOUDBEDS_DEV_REMOTES_MANIFEST) {
      baseUrl = `${CLOUDBEDS_DEV_FRONTEND_ASSETS_DOMAIN}/remotes/dev-ga`;
    }
    return {
      mfdCommon: `${baseUrl}/${CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME}`,
      registry: `${baseUrl}/${CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME}`,
      ...options?.remoteManifestUrls,
    }
  }

  return options?.remoteManifestUrls;
}
