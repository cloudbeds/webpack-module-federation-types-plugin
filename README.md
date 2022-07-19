# module-federation-types-plugin

## Description

Having Webpack 5 module federation architecture in place it's tedious to manually create/maintain
ambient type definitions for your packages so TypeScript can resolve the dynamic imports to their proper types.

While using `@ts-ignore` on your imports works, it is a bummer to lose intellisense and type-checking capabilities.

This package exposes a Webpack plugin and a node CLI command called `make-federated-types`.
It writes a typings file in _dist/@types_ folder and downloads remote types into _src/@types/federated_ folder.

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

Zack
Jackson [was asked several questions](https://github.com/module-federation/module-federation-examples/issues/20#issuecomment-1153131082)
around his plugin hoping that he can suggest some solutions to the exposed problems to no avail.
After a month of waiting this package was built

## Feature comparison tables

| Package                            | Webpack Plugin | Standalone | Polyrepo support | Runtime microapp imports | Include external typings |
|------------------------------------|----------------|------------|------------------|--------------------------|--------------------------|
| @touk/federated-types              | -              | +          | -                | -                        | -                        |
| ruanyl/dts-loader                  | +              | -          | +                | -                        | -                        |
| ruanyl/webpack-remote-types-plugin | +              | -          | +                | -                        | -                        |
| @module-federation/typescript      | +              | -          | +                | -                        | -                        |
| @cloudbeds/wmf-types-plugin        | +              | +          | +                | +                        | -                        |

* _Runtime microapp imports_ refers to the [module-federation/external-remotes-plugin](https://github.com/module-federation/external-remotes-plugin)

| Package                            | Webpack aliases | Exposed aliases | Synchronization/[compile hooks](https://webpack.js.org/api/compiler-hooks/)             |
|------------------------------------|-----------------|-----------------|-----------------------------------------------------------------------------------------|
| @touk/federated-types              | -               | +               | -                                                                                       |
| ruanyl/dts-loader                  | -               | -               | -                                                                                       |
| ruanyl/webpack-remote-types-plugin | -               | -               | download on `beforeRun`, `watchRun`                                                     |
| @module-federation/typescript      | -               | -               | sync on `afterCompile` (leads to double compile), every 1 minute                        |
| @cloudbeds/wmf-types-plugin        | +               | +               | download on `beforeRun`, compile on `afterEmit`, sync every 1 minute or custom interval |

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

To prevent the self signed certificate error, either provide the certificates (TODO)
or set the following environment varialble:

```js
// Prevent the DEPTH_ZERO_SELF_SIGNED_CERT error when downloading from an HTTPS dev-server
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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

When you build your microapp, the plugin will download typings to _src/@types/federated_ folder in the root of the
repository.

### `tsconfig.json`

Configure tsconfig to start using typings in the _src/@types/federated_ folder.

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

### Importing from self as from remote

It is also possible to add self as a remote entry to allow importing from self like from a remote.
Example for an `mfdCommon` microapp:

```js
remotes: {
  mfdCommon: 'mfdCommon@[URL]/remoteEntry.js',
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

|                       Option | Description                                                                                                                                                                                    |
|-----------------------------:|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `syncTypesIntervalInSeconds` | Synchronize types continusouly with a specified value in seconds. To disable continuous synchronization this should be set to `0`. To completely disable the plugin this should be set to `-1` |
