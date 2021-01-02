# @sveltejs/kit

Everything you need to build a Svelte app.

To get started, run `npm init svelte@next` — this will fetch and run the [`create-svelte`](packages/create-svelte) package.

## Developing

This monorepo uses [pnpm](https://pnpm.js.org/en/). Install it...

```bash
npm i -g pnpm
```

...then install this repo's dependencies:

```bash
pnpm i
```

...then build SvelteKit

```bash
pnpm build
```

(This will also have the effect of building all the packages.)

You should now be able to run the [examples](examples) by navigating to one of the directories and doing `pnpm dev`.
