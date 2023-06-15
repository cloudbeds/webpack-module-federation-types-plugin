export const FEDERATION_CONFIG_FILE = 'federation.config.json';

export const DEFAULT_DIR_DIST = 'dist';
export const DEFAULT_DIR_EMITTED_TYPES = '@types';

export const DEFAULT_DIR_GLOBAL_TYPES = 'src/@types';
export const DEFAULT_DIR_DOWNLOADED_TYPES = `src/@types/remotes`;

export const DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS = 60;

export enum CloudbedsCloudfrontDomain {
  Dev = 'https://cb-front.cloudbeds-dev.com',
  Stage = 'https://cb-front.stage-ga.cloudbeds-dev.com',
  Prod = 'https://front.cloudbeds.com',
}

/** @deprecated */
export const CLOUDBEDS_MFD_COMMON_MANIFEST_FILE_NAME = 'mfd-common-remote-entry.json';
export const CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME = 'remote-entries.json';
export const CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD = 'devbox';

export enum CloudbedsMicrofrontend {
  Common = 'mfdCommon',
}
