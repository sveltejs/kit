# READ THIS FIRST!

Here we are, finally SvelteKit is public beta. It's not finished — there are a few known bugs and several missing features — but we're really happy with how it's shaping up and can't wait for you to try it. You can read [announcement](https://svelte.dev/blog/sveltekit-beta) on our blog, where You will find also some informations about how to start with SvelteKit. We still have a lot of work to do to version 1.0, like bringing new adapters, upgrading documentation, and kill some bugs, that want to eat our dinner.

## Documentation

Please see [the documentation](https://kit.svelte.dev/docs) for information about getting started and developing with SvelteKit.

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

### Changelogs

For changes to be reflected in package changelogs, run `pnpx changeset` and follow the prompts.

### Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of changed packages to npm.

> It uses `pnpm publish` rather than `pnpx changeset publish` so that we can use the `--filter` and (while in beta) `--tag` flags — though perhaps they work with `pnpx changeset publish`?

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```
npm publish --access=public
```

### Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subdirectories of `packages/kit/test` such as `packages/kit/test/apps/basics`. To run a single test, open up the file and change `test` to `test.only` for the relevant test.
