# kit.svelte.dev

This is the SvelteKit website. The docs live [here](../../documentation).

## Developing

Once you've [set up the repo](../../CONTRIBUTING.md#preparing), `cd` into this directory and start the dev server:

```bash
cd sites/kit.svelte.dev
pnpm run update
pnpm dev
```

If you get an error like the following, make sure you've run `pnpm check` in the root of the repo to generate the types used by the doc site.

```bash
Error: ENOENT: no such file or directory, open '/kit/packages/kit/types/index.d.ts'
    at Object.openSync (node:fs:592:3)
    at Object.readFileSync (node:fs:460:35)
```
