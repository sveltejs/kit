# READ THIS FIRST!

We're getting ready to open up the SvelteKit public beta, which means that things will be in a stable enough state to start experimenting, and documentation will be available. Right now, even though [this repo is open](https://www.reddit.com/r/sveltejs/comments/m337r7/sveltekit_repository_is_now_public_on_github/gqmvj9k), there are still some major known issues to resolve...

- [#460](https://github.com/sveltejs/kit/issues/460): It doesn't work on Windows
- [#424](https://github.com/sveltejs/kit/issues/424): It doesn't work with TypeScript

...and there are aspects of the design that _will_ change over the next few days. We're close. Please bear with us!

---

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

### Changelogs

For changes to be reflected in package changelogs, run `pnpx changeset` and follow the prompts.

### Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of changed packages to npm.

> It uses `pnpm publish` rather than `pnpx changeset publish` so that we can use the `--filter` and (while in beta) `--tag` flags — though perhaps they work with `pnpx changeset publish`?

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```
npm publish --access=public
```

## Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subdirectories of `packages/kit/test` such as `test/apps/basics`. To run a single test, open up the file and change `test` to `test.only` for the relevant test.
