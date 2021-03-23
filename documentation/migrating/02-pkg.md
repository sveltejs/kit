---
title: package.json
---

### dependencies

Remove `polka` or `express`, if you're using one of those, and any middleware such as `sirv` or `compression`.

### devDependencies

Remove `sapper` from your `devDependencies` and replace it with `@sveltejs/kit`, `vite`, and whichever [adapter](/docs#adapters) you plan to use (see [next section](#project-files-configuration)).

### scripts

Any scripts that reference the `sapper` binary should be updated:

* `sapper build` or `sapper export` should become [`svelte-kit build`](/docs#command-line-interface-svelte-kit-build)
* `sapper dev` should become [`svelte-kit dev`](/docs#command-line-interface-svelte-kit-dev)

Additionally, [`svelte-kit start`](/docs#command-line-interface-svelte-kit-start) replaces any command that invokes your Sapper-built server.