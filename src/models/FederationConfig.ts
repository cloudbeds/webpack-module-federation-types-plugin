import type { ModuleFederationPluginOptions } from './ModuleFederationPluginOptions';

export type FederationConfig = {
  name: string;
  exposes: Dict<string>;
  shared?: ModuleFederationPluginOptions['shared'];
};
