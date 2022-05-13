# SvelteKit Contributing Guide

## Building and Running

This is a monorepo, meaning the repo holds multiple packages. It requires the use of [pnpm](https://pnpm.js.org/en/). You can [install pnpm](https://pnpm.io/installation) with:

```bash
npm i -g pnpm
```

`pnpm` commands run in the project's root directory will run on all sub-projects. You can checkout the code and build all sub-projects with:

```bash
git clone git@github.com:sveltejs/kit.git
cd kit
pnpm install
pnpm build
```

You can now run SvelteKit by linking it into your project with [pnpm `overrides`](https://pnpm.io/package_json#pnpmoverrides) as demonstrated in the [sandbox example](https://github.com/sveltejs/kit-sandbox) or by running one of the test projects as described in [the testing section](#testing) below.

## Code structure

Entry points to be aware of are:

- [`packages/create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte) - code that's run when you create a new project with `npm init svelte`
- [`packages/kit/src/packaging`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/packaging) - for the `svelte-kit package` command
- [`packages/kit/src/core/dev/index.js`](https://github.com/sveltejs/kit/blob/master/packages/kit/src/core/dev/index.js) - for the dev-mode server
- [`packages/kit/src/core/build/index.js`](https://github.com/sveltejs/kit/blob/master/packages/kit/src/core/build/index.js) - for the production server
- [`packages/adapter-[platform]`](https://github.com/sveltejs/kit/tree/master/packages) - for the various SvelteKit-provided adapters

Most code called at build-time or from the CLI entry point lives in [packages/kit/src/core](https://github.com/sveltejs/kit/tree/master/packages/kit/src/core). Code that runs for rendering and routing lives in [packages/kit/src/runtime](https://github.com/sveltejs/kit/tree/master/packages/kit/src/runtime). Most changes to SvelteKit itself would involve code in these two directories.

## Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subdirectories of `packages/kit/test` such as `packages/kit/test/apps/basics`.

You can run the tests for only a single package by first moving to that directory. E.g. `cd packages/kit`.

You must rebuild each time before running the tests if you've made code changes.

To run a single integration test or otherwise control the running of the tests locally see [the Playwright CLI docs](https://playwright.dev/docs/test-cli). Note that you will need to run these commands from the test project directory such as `packages/kit/test/apps/basics`.

You can run the test server with `cd packages/kit/test/apps/basics; pnpm run dev` to hit it with your browser. The Playwright Inspector offers similar functionality.

You may need to install some dependencies first, e.g. with `npx playwright install-deps` (which only works on Ubuntu).

If there are tests that fail on the CI, you can retrieve the failed screenshots by going to the summary page of the CI run. You can usually find this by clicking on "Details" of the check results, click "Summary" at the top-left corner, and then scroll to the bottom "Artifacts" section to download the archive.

## Working on Vite and other dependencies

If you would like to test local changes to Vite or another dependency, you can build it and then use [`pnpm.overrides`](https://pnpm.io/package_json#pnpmoverrides). Please note that `pnpm.overrides` must be specified in the root `package.json` and you must first list the package as a dependency in the root `package.json`:

```jsonc
{
	// ...
	"dependencies": {
		"vite": "^2.0.0"
	},
	"pnpm": {
		"overrides": {
			"vite": "link:../path/to/vite/packages/vite"
		}
	}
}
```

## Documentation changes

All documentation for SvelteKit is in the [`documentation` directory](https://github.com/sveltejs/kit/tree/master/documentation), and any improvements should be made as a Pull Request to this repository. The site itself is located in the [`sites/kit.svelte.dev` directory](https://github.com/sveltejs/kit/tree/master/sites/kit.svelte.dev) and can be run locally to preview changes.

## Sending PRs

### Coding style

There are a few guidelines we follow:

- Internal variables are written with `snake_case` while external APIs are written with `camelCase`
- Provide a single object as the argument to public APIs. This object can have multiple properties
- Avoid creating new test projects under `packages/kit/test/apps` but reuse an existing one when possible
- Ensure `pnpm lint` and `pnpm check` pass. You can run `pnpm format` to format the code

To use the git hooks in the repo, which will save you waiting for CI to tell you that you forgot to lint, run this:

```bash
git config core.hookspath .githooks
```

### Generating changelogs

For changes to be reflected in package changelogs, run `pnpx changeset` and follow the prompts. All changesets should be `patch` until SvelteKit 1.0

## Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of changed packages to npm.

> It uses `pnpm publish` rather than `pnpx changeset publish` so that we can use the `--filter` and (while in beta) `--tag` flags — though perhaps they work with `pnpx changeset publish`?

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```bash
npm publish --access=public
```
