import type { ModuleFederationTypesPluginOptions, RemoteManifestUrls } from '../models';

export function getRemoteManifestUrls(
  options?: ModuleFederationTypesPluginOptions,
): RemoteManifestUrls | undefined {
  if (options?.remoteManifestUrl) {
    return {
      ...options?.remoteManifestUrls,
      registry: options?.remoteManifestUrl,
    };
  }

  return options?.remoteManifestUrls;
}
