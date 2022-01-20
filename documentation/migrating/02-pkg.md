---
title: package.json
---

### type: "module"

Add `"type": "module"` to your `package.json`. You can do this step separately from the rest as part of an incremental migration if you are using Sapper 0.29.3
or newer.

### dependencies

Remove `polka` or `express`, if you're using one of those, and any middleware such as `sirv` or `compression`.

### devDependencies

Remove `sapper` from your `devDependencies` and replace it with `@sveltejs/kit` and whichever [adapter](/docs#adapters) you plan to use (see [next section](#project-files-configuration)).

### scripts

Any scripts that reference `sapper` should be updated:

- `sapper build` should become [`svelte-kit build`](/docs#command-line-interface-svelte-kit-build) using the Node [adapter](/docs#adapters)
- `sapper export` should become [`svelte-kit build`](/docs#command-line-interface-svelte-kit-build) using the static [adapter](/docs#adapters)
- `sapper dev` should become [`svelte-kit dev`](/docs#command-line-interface-svelte-kit-dev)
- `node __sapper__/build` should become `node build`
