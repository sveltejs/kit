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
pnpm -r build
```

You should now be able to run the [examples](examples) by navigating to one of the directories and doing `pnpm dev`.

Run `pnpm dev` inside the `packages/kit` directory to continually rebuild `@sveltejs/kit` as you make changes to SvelteKit. Restarting the example/test apps will cause the newly built version to be used.

### Version bumps

For changes to be reflected in package changelogs, run `pnpx changeset` and follow the prompts.

When you're ready to cut a release, run `pnpx changeset version`. This will bump versions according to the as-yet-unapplied changesets, and update changelogs.

### Releases

After running `pnpx changeset version`, publish versions of packages that have changed by running `pnpm publish-all`.

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```
npm publish --access=public
```

## Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subpackages of `test/` such as `test/apps/basics/`. To run a single test, open up the file and change `test` to `test.only` for the relevant test.
