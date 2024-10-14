import path from 'node:path';

import { FEDERATION_CONFIG_FILE } from '../../constants';
import type { FederationConfig } from '../../models';

export function getFederationConfig(customConfigPath?: string): FederationConfig {
  const federationConfigPath = path.resolve(customConfigPath || FEDERATION_CONFIG_FILE);
  if (!federationConfigPath) {
    console.error(`ERROR: Could not find ${FEDERATION_CONFIG_FILE} in project's root directory`);
    process.exit(1);
  }

  const config: FederationConfig = require(federationConfigPath);
  if (!config || !Object.keys(config?.exposes || {}).length) {
    console.error(`ERROR: Invalid ${FEDERATION_CONFIG_FILE}`);
    process.exit(1);
  }

  console.log(`Using config file: ${federationConfigPath}`);

  return config;
}
