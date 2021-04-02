---
title: Command Line Interface
---

SvelteKit includes a command line interface for building and running your app.

In the default project template `svelte-kit dev`, `svelte-kit build` and `svelte-kit start` are aliased as `npm run dev`, `npm run build` and `npm start` respectively. You can also invoke the CLI with [npx](https://www.npmjs.com/package/npx):

```bash
npx svelte-kit dev
```

### svelte-kit dev

Starts a development server. It accepts the following options:

- `-p`/`--port` — which port to start the server on
- `-o`/`--open` — open a browser tab once the server starts
- `-h`/`--host` — expose the server to the network. This will allow people using the same coffee shop WiFi as you to see files on your computer; use it with care
- `-H`/`--https` — launch an HTTPS server using a self-signed certificate. Useful for testing HTTPS-only features on an external device

### svelte-kit build

Builds a production version of your app, and runs your adapter if you have one specified in your [config](#configuration). It accepts the following option:

- `--verbose` — log more detail

### svelte-kit start

After you've built your app with `svelte-kit build`, you can start the production version (irrespective of any adapter that has been applied) locally with `svelte-kit start`. This is intended for testing the production build locally, **not for serving your app**, for which you should always use an adapter.

Like `svelte-kit dev`, it accepts the following options:

- `-p`/`--port`
- `-o`/`--open`
- `-h`/`--host` (note the security caveat [above](#command-line-interface-svelte-kit-dev))
- `-H`/`--https`
