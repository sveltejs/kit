# @sveltejs/kit

Everything you need to build a Svelte app.

To get started, run `npm init svelte@next` — this will fetch and run the [`create-svelte`](packages/create-svelte) package.

## Developing

This monorepo uses [pnpm](https://pnpm.js.org/en/). Install it...

```bash
npm i -g pnpm
```

...then install this repo's dependencies...

```bash
pnpm i
```

...then build SvelteKit and the other packages:

```bash
pnpm build
```

You should now be able to run the [examples](examples) by navigating to one of the directories and doing `pnpm dev`.

### Version bumps

You can bump the package versions by running `pnpx changeset` followed by `pnpx changeset version`.

## Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subpackages of `test/` such as `test/apps/basics/`. To run a single test, open up the file and change `test` to `test.only` for the relevant test.
