export const FEDERATION_CONFIG_FILE = 'federation.config.json';
export const TS_CONFIG_FILE = 'tsconfig.json';

export const DEFAULT_DIR_DIST = 'dist';
export const DEFAULT_DIR_EMITTED_TYPES = '@types';

export const DEFAULT_DIR_GLOBAL_TYPES = 'src/@types';
export const DEFAULT_DIR_DOWNLOADED_TYPES = `src/@types/remotes`;

export const DEFAULT_DOWNLOAD_TYPES_INTERVAL_IN_SECONDS = 60;

export enum CloudbedsCloudfrontDomain {
  Dev = 'https://cb-front.cloudbeds-dev.com',
  Stage = 'https://cb-front.cloudbeds-stage.com',
  Prod = 'https://front.cloudbeds.com',
}

export const CLOUDBEDS_REMOTES_MANIFEST_FILE_NAME = 'remote-entries.json';
export const CLOUDBEDS_DEPLOYMENT_ENV_WITH_DISABLED_REMOTE_TYPES_DOWNLOAD = 'devbox';
