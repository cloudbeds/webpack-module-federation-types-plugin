import { existsSync } from 'fs';

export function getWebpackConfigPathFromArgs(webpackConfigPath?: string): string {
  if (!webpackConfigPath) {
    if (existsSync('webpack.config.ts')) {
      webpackConfigPath = 'webpack.config.ts';
    } else if (existsSync('webpack.config.js')) {
      webpackConfigPath = 'webpack.config.js';
    } else {
      console.error(`Could not find webpack.config.ts file at ${process.cwd()}`);
      process.exit(1);
    }
  }

  return webpackConfigPath;
}
