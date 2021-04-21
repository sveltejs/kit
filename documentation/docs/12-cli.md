---
title: Command Line Interface
---

SvelteKit includes a command line interface for building and running your app.

In the default project template `svelte-kit dev`, `svelte-kit build` and `svelte-kit build --preview` are aliased as `npm run dev`, `npm run build` and `npm preview` respectively. You can also invoke the CLI with [npx](https://www.npmjs.com/package/npx):

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

It also has a preview mode for testing the production build locally (irrespective of any adapter that has been applied). It accepts the following options (with the same meaning as in `svelte-kit dev`):

- `-P`/`--preview` — serve the app after building

- `-p`/`--port`
- `-o`/`--open`
- `-h`/`--host` (note the security caveat [above](#command-line-interface-svelte-kit-dev))
- `-H`/`--https`

> Preview mode should _not_ be used to serve your app in production. Instead, [specify an appropriate adapter](#adapters) and deploy its output to the production environment.
