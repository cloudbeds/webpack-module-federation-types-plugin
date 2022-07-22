# module-federation-types-plugin

## Description

This package exposes a Webpack plugin and a node CLI command called `make-federated-types`.


It compiles types into a _dist/@types/index.d.ts_ file and downloads such
compiled remote types from other microapps into _src/@types/remotes_ folder.
Global type definitions from _src/@types/*.d.ts_ are included in compilation.

Synchronization of types happens after every compilation and with a 1-minute interval when idle.

## History

Having Webpack 5 module federation architecture in place it's tedious to manually create/maintain
ambient type definitions for your packages so TypeScript can resolve the dynamic imports to their proper types.

While using `@ts-ignore` on your imports works, it is a bummer to lose intellisense and type-checking capabilities.

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

| Feature                            | @touk/<br>federated-types | ruanyl/dts-loader | ruanyl/webpack-remote-types-plugin | @module-federation/typescript | @cloudbeds/wmf-types-plugin |
|------------------------------------|---------------------------|-------------------|------------------------------------|-------------------------------|-----------------------------|
| Webpack Plugin                     | -                         | +                 | +                                  | +                             | +                           |
| Standalone                         | +                         | -                 | -                                  | -                             | +                           |
| Polyrepo support                   | -                         | +                 | +                                  | +                             | +                           |
| Runtime microapp imports           | -                         | -                 | -                                  | -                             | +                           |
| Include external typings           | -                         | -                 | -                                  | -                             | -                           |
| Webpack aliases                    | -                         | -                 | -                                  | -                             | +                           |
| Exposed aliases                    | +                         | +                 | +                                  | -                             | +                           |
| Excessive recompilation prevention | -                         | -                 | -                                  | -                             | +                           |

*_Runtime microapp imports_ refers to templated remote URLs that are resolved in runtime using
[module-federation/external-remotes-plugin](https://github.com/module-federation/external-remotes-plugin)

*_Synchronization_ refers to [webpack compile hooks](https://webpack.js.org/api/compiler-hooks/)

*_Excessive recompilation_ refers to the fact that the plugin is not smart enough to detect when the typings file is changed.
Every time a `d.ts` file is downloaded, webpack recompiles the whole bundle because the watcher compares the timestamp only, which is updated on every download.

| Package                            | Emitted destination                                  | Download destination | Synchronization/[compile hooks](https://webpack.js.org/api/compiler-hooks/)                              |
|------------------------------------|------------------------------------------------------|----------------------|----------------------------------------------------------------------------------------------------------|
| @touk/federated-types              | file in <br> `node_modules/@types/__federated_types` | -                    | -                                                                                                        |
| ruanyl/dts-loader                  | folders in <br> `.wp_federation`                     | -                    | -                                                                                                        |
| ruanyl/webpack-remote-types-plugin | -                                                    | `types/[name]-dts`   | download on `beforeRun` and `watchRun`                                                                   |
| @module-federation/typescript      | folders in <br> `dist/@mf-typescript`                | `@mf-typescript`     | compile and download on `afterCompile` (leads to double compile), <br> redo every 1 minute when idle     |
| @cloudbeds/wmf-types-plugin        | file in <br> `dist/@types`                           | `src/@types/remotes` | download on startup, <br> compile `afterEmit`, <br> download every 1 minute or custom interval when idle |


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

To enable verbose logging add folowing in webpack config:

```js
  infrastructureLogging: {
    level: 'log'
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

When you build your microapp, the plugin will download typings to _src/@types/remotes_ folder

### Importing from self as from remote

It is also possible to add self as a remote entry to allow importing from self like from a remote.
Example for an `mfdCommon` microapp:

```js
remotes: {
  mfdCommon: 'mfdCommon@[mfdCommon]/remoteEntry.js'
}
```

## CI/CD

It is suggested to download types in a CI workflow only when a branch in a PR targets `main` branch.

This way the downloaded types will always correspond to the latest versions of dependent microapps
and result in valid static type checking.

Branches may need to use dev branches of other microfrontends, thus will have to commit those types
to avoid failing workflows.

### `.gitignore`

```
# Downloaded remote microapp types
@remote-types
```

## Plugin Options

|                            Option |        Value         | Description                                                                                                                                                                                                                                          |
|----------------------------------:|:--------------------:|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `cloudbedsRemoteManifestsBaseUrl` |       `string`       | Base URL for remote manifest files (a.k.a remote entry configs) that is specific to Cloudbeds microapps <br><br> _Examples:_ <br> `http://localhost:4480/remotes/dev` <br> `https://cb-front.cloudbeds-dev.com/remotes/[env]` <br> `use-devbox-name` |
|      `syncTypesIntervalInSeconds` | `number`, `0`, `-1`  | Synchronize types continusouly with a specified value in seconds. <br><br> `0` - disables continuous synchronization. <br> `-1` - disables the plugin                                                                                                |
|              `remoteManifestUrls` | `RemoteManifestUrls` | URLs to remote manifest files. A manifest contains a URL to a remote entry that is substituted in runtime. Multiple remote entries is supported via `registry` field. <br><br> More details available in [this section](#templated-remote-urls)      |

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

or

```js
new ModuleFederationTypesPlugin({
  cloudbedsRemoteManifestsBaseUrl: 'https://localhost:4480/remotes/dev',
})
```

See [`RemoteManifest` and `RemotesRegistryManifest` in types.ts](src/types.ts) to observe the signature.

Eventually the origin, e.g. `https://localhost:9082` is used to fetch the types from
