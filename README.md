# READ THIS FIRST!

SvelteKit is still in beta. Expect bugs! Read more [here](https://svelte.dev/blog/sveltekit-beta), and track progress towards 1.0 [here](https://github.com/sveltejs/kit/issues?q=is%3Aopen+is%3Aissue+milestone%3A1.0).

## Documentation

Please see [the documentation](https://kit.svelte.dev/docs) for information about getting started and developing with SvelteKit.

## Packages

| Package                                                                     | Changelog                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [@sveltejs/kit](packages/kit)                                               | [Changelog](packages/kit/CHANGELOG.md)                        |
| [create-svelte](packages/create-svelte)                                     | [Changelog](packages/create-svelte/CHANGELOG.md)              |
| [@sveltejs/adapter-node](packages/adapter-node)                             | [Changelog](packages/adapter-node/CHANGELOG.md)               |
| [@sveltejs/adapter-static](packages/adapter-static)                         | [Changelog](packages/adapter-static/CHANGELOG.md)             |
| [@sveltejs/adapter-cloudflare-workers](packages/adapter-cloudflare-workers) | [Changelog](packages/adapter-cloudflare-workers/CHANGELOG.md) |
| [@sveltejs/adapter-netlify](packages/adapter-netlify)                       | [Changelog](packages/adapter-netlify/CHANGELOG.md)            |
| [@sveltejs/adapter-vercel](packages/adapter-vercel)                         | [Changelog](packages/adapter-vercel/CHANGELOG.md)             |

The SvelteKit community also makes additional [SvelteKit adapters available for use](https://sveltesociety.dev/components#category-SvelteKit%20Adapters).

## Bug reporting

Please make sure the issue you're reporting involves SvelteKit. Many issues related to how a project builds originate from [Vite](https://vitejs.dev/), which SvelteKit uses to build a project. It's important to note that new Vite projects don't use SSR by default and so if you create a new Vite project from scratch many issues won't reproduce eventhough they're caused by Vite. You should thus start with a project that utilizes SSR such as:

- https://github.com/GrygrFlzr/vite-ssr-d3
- https://github.com/sveltejs/vite-plugin-svelte/tree/main/packages/e2e-tests/vite-ssr

If an issue is caused by Vite, please report in the [Vite issue tracker](https://github.com/vitejs/vite/issues).

## Developing

This is a monorepo meaning the repo holds multiple packages. It requires the use of [pnpm](https://pnpm.js.org/en/). You can [install pnpm](https://pnpm.io/installation) with:

```bash
npm i -g pnpm
```

`pnpm` commands run in the project's root directory will run on all sub-projects. You can checkout the code and build all sub-projects with:

```bash
git@github.com:sveltejs/kit.git
cd kit
pnpm install
pnpm build
```

You should now be able to run the [examples](examples) by navigating to one of the directories and doing `pnpm dev`.

Run `pnpm dev` inside the `packages/kit` directory to continually rebuild `@sveltejs/kit` as you make changes to SvelteKit. Restarting the example/test apps will cause the newly built version to be used.

To use the git hooks in the repo, which will save you waiting for CI to tell you that you forgot to lint, run this:

```bash
git config core.hookspath .githooks
```

### Coding style

There are a few guidelines we follow:
- Internal variables are written with `snake_case` while external APIs are written with `camelCase`
- Provide a single object as the argument to public APIs. This object can have multiple properties
- Avoid creating new test projects under `packages/kit/test/apps` but reuse an existing one when possible
- Ensure `pnpm lint` and `pnpm check` pass. You can run `pnpm format` to format the code

### Generating changelogs

For changes to be reflected in package changelogs, run `pnpx changeset` and follow the prompts. All changesets should be `patch` until SvelteKit 1.0

### Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subdirectories of `packages/kit/test` such as `packages/kit/test/apps/basics`.

You can run the tests for only a single package by first moving to that directory. E.g. `cd packages/kit`.

You must rebuild each time before running the tests if you've made code changes.

To run a single integration test, provide the `FILTER` env var with the test name. E.g. `FILTER="includes paths" pnpm test:integration`. You can also open up the file and change `test` to `test.only`.

You can run the test server with `cd packages/kit/test/apps/basics; pnpm run dev` to hit it with your browser.

You may need to install some dependencies first e.g. with `npx playwright install-deps` (which only works on Ubuntu).

### Documentation

All documentation for SvelteKit is in the `documentation` directory, any improvements should be made as a Pull Request to this repository. The documentation is served via and API, the site itself is located in the [`sites` repository](https://github.com/sveltejs/sites).

If you wish to preview documentation changes locally, please follow the instructions here: [Previewing local docs changes](https://github.com/sveltejs/sites/blob/master/sites/kit.svelte.dev/README.md#previewing-local-docs-changes).

### Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of changed packages to npm.

> It uses `pnpm publish` rather than `pnpx changeset publish` so that we can use the `--filter` and (while in beta) `--tag` flags — though perhaps they work with `pnpx changeset publish`?

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```
npm publish --access=public
```

## Code structure

Entry points to be aware of are:
- [`packages/create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte) - code that's run when you create a new project with `npm init svelte@next`
- [`packages/kit/src/packaging`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/packaging) - for the `svelte-kit package` command
- [`packages/kit/src/core/dev/index.js`](https://github.com/sveltejs/kit/blob/master/packages/kit/src/core/dev/index.js) - for the dev-mode server
- [`packages/kit/src/core/build/index.js`](https://github.com/sveltejs/kit/blob/master/packages/kit/src/core/build/index.js) - for the production server
- [`packages/adapter-[platform]`](https://github.com/sveltejs/kit/tree/master/packages) - for the various SvelteKit-provided adapters

Most code that's called at build-time or from the CLI entry point lives in [packages/kit/src/core](https://github.com/sveltejs/kit/tree/master/packages/kit/src/core). Code that runs for rendering and routing lives in [packages/kit/src/runtime](https://github.com/sveltejs/kit/tree/master/packages/kit/src/runtime). Most changes to SvelteKit itself would involve code in these two directories.
