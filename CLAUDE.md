# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Webpack plugin (`@cloudbeds/webpack-module-federation-types-plugin`) that generates and shares TypeScript type definitions between Webpack Module Federation micro-frontends. It has two main functions:
1. **Compile types** — generates `.d.ts` files from exposed MF modules
2. **Download types** — fetches `.d.ts` files from remote MF modules

Published to GitHub Packages (`npm.pkg.github.com`).

## Commands

```bash
npm run build          # Compile TypeScript (tsc) to dist/
npm run watch          # Compile in watch mode
npm test               # Run tests (vitest)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with Istanbul coverage
npm run lint           # Biome check with auto-fix (--write --unsafe)
npm run lint:ts        # TypeScript type-check (tsc --noEmit)
npm run check          # lint + lint:ts + test (full validation)
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

### Plugin Entry Point (`src/plugin.ts`)
`ModuleFederationTypesPlugin` implements `WebpackPluginInstance`. It hooks into the Webpack compiler lifecycle:
- `beforeRun` / `watchRun` — downloads remote types on startup
- `afterEmit` — compiles types for exposed modules; in dev mode, also sets an interval to re-download remote types periodically

The plugin discovers `ModuleFederationPlugin` options from the compiler's plugin list (supports MF v1, v2, and Rspack variants).

### Type Compilation (`src/compileTypes/`)
- `compileTypes.ts` — synchronous compilation using the TypeScript Compiler API with an in-memory emit host. Produces a single `index.d.ts` bundle.
- `compileTypesAsync.ts` — runs compilation in a `Worker` thread to avoid blocking Webpack. Manages worker lifecycle (terminates previous workers on recompilation).
- `compileTypesWorker.ts` — the worker thread entry point; calls `compileTypes` then `rewritePathsWithExposedFederatedModules`.
- `rewritePathsWithExposedFederatedModules.ts` — rewrites `declare module` paths in the emitted `.d.ts` to use federated module names (e.g., `"appName/ExposedModule"` instead of internal file paths). Also handles module aliases and node_modules type inclusion.

### Type Downloading (`src/downloadTypes/`)
- `downloadTypes.ts` — orchestrates downloading `.d.ts` files from remote MF apps. Resolves remote entry URLs from direct config or manifest files, then downloads in parallel.
- Helpers handle manifest fetching, URL resolution, and file writing to the local `@types/remotes/` directory.

### CLI Binaries (`src/bin/`)
- `make-federated-types` — standalone CLI to compile types without running Webpack (reads federation config from `federation.config.json` or webpack config)
- `download-federated-types` — standalone CLI to download remote types

### Key Types (`src/models/`)
- `ModuleFederationTypesPluginOptions` — plugin configuration (directories, disable flags, remote URLs, manifest URLs)
- `FederationConfig` — the MF plugin's `name`, `exposes`, `remotes`, `shared` config
- `RemoteEntryUrls` / `RemoteManifestUrls` — URL mappings for remote type resolution

## Code Style

- **Biome** for linting and formatting: 2-space indent, single quotes, 100 char line width, no parens on single-param arrows
- **Pre-commit hook** (simple-git-hooks): runs `npm run lint`
- Output is CommonJS (`"module": "CommonJS"` in tsconfig)
- Global `Dict` type is defined in `src/@types/utility.d.ts`
- Tests are co-located with source in `__tests__/` subdirectories

## CI

The `push.yml` workflow runs lint, test, and build on non-main pushes. Releases are automated via semantic-release on `main`.
