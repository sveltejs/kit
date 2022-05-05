---
title: Command Line Interface
---

SvelteKit includes a command line interface for building and running your app.

In the default project template `svelte-kit dev`, `svelte-kit build` and `svelte-kit preview` are aliased as `npm run dev`, `npm run build` and `npm run preview` respectively. You can also invoke the CLI with [npx](https://www.npmjs.com/package/npx):

```bash
npx svelte-kit dev
```

### svelte-kit dev

Starts a development server. It accepts the following options:

- `-p`/`--port` — which port to start the server on
- `-o`/`--open` — open a browser tab once the server starts
- `--host` — expose the server to the network.
- `--https` — launch an HTTPS server using a self-signed certificate. Useful for testing HTTPS-only features on an external device

> This command will fail if the specified (or default) port is unavailable. To use an alternative port instead of failing, set the [`config.kit.vite.server.strictPort`](/docs/configuration#vite) option to `false`.

### svelte-kit build

Builds a production version of your app, and runs your adapter if you have one specified in your [config](/docs/configuration). It accepts the following option:

- `--verbose` — log more detail

After building the app, you can reference the documentation of your chosen [adapter](/docs/adapters) and hosting platform for specific instructions on how to serve your app.

### svelte-kit preview

After you've built your app with `svelte-kit build`, you can start the production version (irrespective of any adapter that has been applied) locally with `svelte-kit preview`. This is intended for testing the production build locally, **not for serving your app**, for which you should always use an [adapter](/docs/adapters).

Like `svelte-kit dev`, it accepts the following options:

- `-p`/`--port`
- `-o`/`--open`
- `--host`
- `--https`

### svelte-kit package

> `svelte-kit package` is currently experimental and is not subject to Semantic Versioning rules. Non-backward compatible changes may occur in any future release.

For package authors, see [packaging](/docs/packaging). `svelte-kit package` accepts the following options:

- `-w`/`--watch` — watch files in `src/lib` for changes and rebuild the package
