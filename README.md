# module-federation-types-plugin

## Description

Having Webpack 5 module federation architecture in place it's tedious to manually create/maintain
ambient type definitions for your packages so TypeScript can resolve the dynamic imports to their proper types.

While using `@ts-ignore` on your imports works, it is a bummer to lose intellisense and type-checking capabilities.

This package exposes a Webpack plugin and a node CLI command called `make-federated-types`.
It writes a typings file in _dist/@types_ folder and downloads remote types into _@remote-types_ folder.

Synchronization of types happens after every compilation and with a 1-minute interval when idle.

## History

Inspired by several existing solutions:

- [@touk/federated-types](https://github.com/touk/federated-types)
  a fork of [pixability/federated-types](https://github.com/pixability/federated-types)
- [ruanyl/dts-loader](https://github.com/ruanyl/dts-loader)
- [ruanyl/webpack-remote-types-plugin](https://github.com/ruanyl/webpack-remote-types-plugin), a wmf remotes-aware
  downloader
  of typings that can be used also with files emitted using `@touk/federated-types`
  . [Example](https://github.com/jrandeniya/federated-types-sample).
- [@module-federation/typescript](https://app.privjs.com/buy/packageDetail?pkg=@module-federation/typescript)
  from the creator of Webpack Module Federation, Zack Jackson (aka [ScriptAlchemy](https://twitter.com/ScriptedAlchemy))

Zack Jackson was asked for help with
[several issues](https://github.com/module-federation/module-federation-examples/issues/20#issuecomment-1153131082)
around his plugin. There was a hope that he can suggest some solutions to the exposed problems, to no avail.
After a month of waiting this package was built.

## Feature comparison tables

| Package                            | Webpack Plugin | Standalone | Polyrepo support | Runtime microapp imports | Include external typings |
|------------------------------------|----------------|------------|------------------|--------------------------|--------------------------|
| @touk/federated-types              | -              | +          | -                | -                        | -                        |
| ruanyl/dts-loader                  | +              | -          | +                | -                        | -                        |
| ruanyl/webpack-remote-types-plugin | +              | -          | +                | -                        | -                        |
| @module-federation/typescript      | +              | -          | +                | -                        | -                        |
| @cloudbeds/wmf-types-plugin        | +              | +          | +                | +                        | -                        |

*_Runtime microapp imports_ refers to templated remote URLs that are resolved in runtime using
[module-federation/external-remotes-plugin](https://github.com/module-federation/external-remotes-plugin)

<br>

| Package                            | Webpack aliases | Exposed aliases | Synchronization/[compile hooks](https://webpack.js.org/api/compiler-hooks/)              |
|------------------------------------|-----------------|-----------------|------------------------------------------------------------------------------------------|
| @touk/federated-types              | -               | +               | -                                                                                        |
| ruanyl/dts-loader                  | -               | -               | -                                                                                        |
| ruanyl/webpack-remote-types-plugin | -               | -               | download on `beforeRun`, `watchRun`                                                      |
| @module-federation/typescript      | -               | -               | sync on `afterCompile` (leads to double compile), every 1 minute                         |
| @cloudbeds/wmf-types-plugin        | +               | +               | download on `initialize`, compile on `afterEmit`, sync every 1 minute or custom interval |

<br>

| Package                            | Emitted destination                             | Download destination |
|------------------------------------|-------------------------------------------------|----------------------|
| @touk/federated-types              | file in `node_modules/@types/__federated_types` | -                    |
| ruanyl/dts-loader                  | folders in `.wp_federation`                     | -                    |
| ruanyl/webpack-remote-types-plugin | -                                               | `types/[name]-dts`   |
| @module-federation/typescript      | folders in `dist/@mf-typescript`                | `@mf-typescript`     |
| @cloudbeds/wmf-types-plugin        | file in `dist/@types`                           | `@remote-types`      |

## Installation

```sh
npm i @cloudbeds/webpack-module-federation-types-plugin
```

## Exposed modules

Create a `federation.config.json` that will contain the remote name and exported members.
This file is mandatory for the standlone script but not required for the plugin.

Properties of this object can be used in Webpack's `ModuleFederationPlugin` configuration object
and required by the standalone script. Example:

### `federation.config.json`

Requirements:

- all paths must be relative to the project root
- the `/index` file name suffix is mandatory (without file extension)

```json
{
  "name": "microapp-42",
  "exposes": {
    "./Button": "./src/view-layer/components/Button",
    "./Portal": "./src/view-layer/index"
  }
}
```

### `webpack.config.js`

Spread these properties into your `ModuleFederationPlugin` configuration and add `ModuleFederationTypesPlugin` to every
microapp, like so:

```js
import webpack from 'webpack';
import { ModuleFederationTypesPlugin } from '@cloudbeds/webpack-module-federation-types-plugin';

import federationConfig from '../federation.config.json';

const { ModuleFederationPlugin } = webpack.container;

module.exports = {
  /* ... */
  plugins: [
    new ModuleFederationPlugin({
      ...federationConfig,
      filename: 'remoteEntry.js',
      shared: {
        ...require('./package.json').dependencies,
      },
    }),
    new ModuleFederationTypesPlugin({
      syncTypesIntervalInSeconds: 120,
    }),
  ],
}
```

### `package.json`

The standalone `make-federated-types` script writes types to the _dist/@types_ folder, the same way as the plugin does.
It is useful for testing and debugging purposes or when it is not desired to update types automatically during the build
process.

This script should not be used in CI as the `build` script already writes the types.

It can be called like so:

```sh
npx make-federated-types
```

## Consuming remote types

When you build your microapp, the plugin will download typings to _@remote-types_ folder in the root of the
repository.

### `tsconfig.json`

Configure tsconfig to start using typings in the _@remote-types_ folder.

```json
{
  "include": [
    "@remote-types",
    "src/**/*.ts",
    "webpack/**/*.ts"
  ]
}
```

Paths to global types should be added to `typeRoots`

```json
{
  "compilerOptions": {
    "typeRoots": [
      "node_modules/@types",
      "src/@types"
    ]
  }
}
```

Such types should be added to a subfolder so that they can be discovered by the invoked Typescript compiler, e.g.:

```
src/
└── @types/
    └── shared/
        ├── index.d.ts
        ├── utility.d.ts
        └── wmf-remotes.d.ts
```

### Importing from self as from remote

It is also possible to add self as a remote entry to allow importing from self like from a remote.
Example for an `mfdCommon` microapp:

```js
remotes: {
  mfdCommon: 'mfdCommon@[mfdCommon]/remoteEntry.js'
}
```

## CI/CD

It is suggested to put the folder with downloaded types to `.gitignore`
and commit the types using your CI in PRs that target `main`/`dev` branch.

This way downloaded types will always correspond to the latest compatible version of microapps.

### `.gitignore`

```
# Downloaded remote microapp types
@remote-types
```

## Plugin Options

|                       Option |        Value         | Description                                                                                                                                                                   |
|-----------------------------:|:--------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `syncTypesIntervalInSeconds` | `number`, `0`, `-1`  | Synchronize types continusouly with a specified value in seconds. <br><br> `0` - disables continuous synchronization. <br> `-1` - disables the plugin                         |
|         `remoteManifestUrls` | `RemoteManifestUrls` | URLs to remote config manifests. A manifest contains a URL to a remote entry that is substituted in runtime. More details available in [this section](#templated-remote-urls) |

## Templated Remote URLs

Templated URLs are URLs to the external remotes that are substituted in runtime using a syntax that is used in
[module-federation/external-remotes-plugin](https://github.com/module-federation/external-remotes-plugin)

_Example:_ for a `mfdCommon` remote entry:

```js
{ mfdCommon: 'mfdCommon@[mfdCommon]/remoteEntry.js' }
```

The `[mfdCommon]` placeholder refers to `window.mfdCommon` in runtime
That part is replaced by URL that is fetched from a remote manifest file:

```js
new ModuleFederationTypesPlugin({
  remoteManifestUrls: {
    mfdCommon: 'https://localhost:4480/remotes/dev/mfd-common-remote-entry.json',
    registry: 'https://localhost:4480/remotes/dev/remote-entries.json',
  }
})
```

See [`RemoteManifest` and `RemotesRegistryManifest` in types.ts](src/types.ts) to observe the signature.

Eventually the origin, e.g. `https://localhost:9082` is used to fetch the types from
