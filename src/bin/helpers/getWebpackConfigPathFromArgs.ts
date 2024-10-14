import { existsSync } from 'node:fs';

export function getWebpackConfigPathFromArgs(configPath?: string): string {
  if (configPath) {
    return configPath;
  }

  if (existsSync('webpack.config.ts')) {
    return 'webpack.config.ts';
  }

  if (existsSync('webpack.config.js')) {
    return 'webpack.config.js';
  }

  console.error(`Could not find webpack.config.ts file at ${process.cwd()}`);
  process.exit(1);
}
