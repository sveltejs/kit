# SvelteKit Contributing Guide

## Preparing

This is a monorepo, meaning the repo holds multiple packages. It requires the use of [pnpm](https://pnpm.io/). You can [install pnpm](https://pnpm.io/installation) with:

```bash
npm i -g pnpm
```

`pnpm` commands run in the project's root directory will run on all sub-projects. You can checkout the code and install the dependencies with:

```bash
git clone git@github.com:sveltejs/kit.git
cd kit
pnpm install
```

## Testing Changes

### Playground

You can use the playground at [`playgrounds/basic`](./playgrounds/basic/) to experiment with your changes to SvelteKit locally.

### Linking

If you want to test against an existing project, you can use [pnpm `overrides`](https://pnpm.io/package_json#pnpmoverrides) in that project:

```jsonc
{
	// ...
	"pnpm": {
		"overrides": {
			"@sveltejs/kit": "link:../path/to/svelte-kit/packages/kit",
			// additionally/optional the adapter you're using
			"@sveltejs/adapter-auto": "link:../path/to/svelte-kit/packages/adapter-auto"
		}
	}
}
```

## Code structure

Entry points to be aware of are:

- [`packages/create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte) - code that's run when you create a new project with `npm create svelte@latest`
- [`packages/package`](https://github.com/sveltejs/kit/tree/master/packages/package) - for the `svelte-package` command
- [`packages/kit/src/core`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/core) - code that's called at dev/build-time
- [`packages/kit/src/core/sync`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/core/sync) - for `svelte-kit sync`, which regenerates routing info and type definitions
- [`packages/kit/src/runtime`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/runtime) - code that's called at runtime
- [`packages/kit/src/exports/vite`](https://github.com/sveltejs/kit/tree/master/packages/kit/src/exports/vite) - for all the Vite plugin related stuff
- [`packages/adapter-[platform]`](https://github.com/sveltejs/kit/tree/master/packages) - for the various SvelteKit-provided adapters

## Good first issues

If you're looking for an issue to tackle to get familiar with the codebase and test suite, the [**low hanging fruit**](https://github.com/sveltejs/kit/issues?q=is%3Aissue+is%3Aopen+label%3A%22low+hanging+fruit%22) label contains issues that ought to be relatively straightforward to fix. Check to see if a PR already exists for an issue before working on it!

Issues that have a clear solution but which _may_ be slightly more involved have the [**ready to implement**](https://github.com/sveltejs/kit/issues?q=is%3Aissue+is%3Aopen+label%3A%22ready+to+implement%22) label.

Issues with the [**soon**](https://github.com/sveltejs/kit/issues?q=is%3Aissue+is%3Aopen+milestone%3Asoon) milestone are higher priority than issues with the [**later**](https://github.com/sveltejs/kit/issues?q=is%3Aissue+is%3Aopen+milestone%3Alater+) label (though PRs for 'later' issues are still welcome, especially if you're affected by them).

## Testing

Run `pnpm test` to run the tests from all subpackages. Browser tests live in subdirectories of `packages/kit/test` such as `packages/kit/test/apps/basics`.

You can run the tests for only a single package by first moving to that directory. E.g. `cd packages/kit`.

For some packages you must rebuild each time before running the tests if you've made code changes. These packages have a `build` command. Packages like `packages/kit` don't require a build step.

To run a single integration test or otherwise control the running of the tests locally see [the Playwright CLI docs](https://playwright.dev/docs/test-cli). Note that you will need to run these commands from the test project directory such as `packages/kit/test/apps/basics`.

You can run the test server with `cd packages/kit/test/apps/basics; pnpm run dev` to hit it with your browser. The Playwright Inspector offers similar functionality.

You may need to install some dependencies first, e.g. with `npx playwright install-deps` (which only works on Ubuntu).

If there are tests that fail on the CI, you can retrieve the failed screenshots by going to the summary page of the CI run. You can usually find this by clicking on "Details" of the check results, clicking "Summary" at the top-left corner, and then scrolling to the bottom "Artifacts" section to download the archive.

It is very easy to introduce flakiness in a browser test. If you try to fix the flakiness in a test, you can run it until failure to gain some confidence you've fixed the test with a command like:

```
npx playwright test --workers=1 --repeat-each 1000 --max-failures 1 -g "accepts a Request object"
```

## Working on Vite and other dependencies

If you would like to test local changes to Vite or another dependency, you can build it and then use [`pnpm.overrides`](https://pnpm.io/package_json#pnpmoverrides). Please note that `pnpm.overrides` must be specified in the root `package.json` and you must first list the package as a dependency in the root `package.json`:

```jsonc
{
	// ...
	"dependencies": {
		"vite": "^4.0.0"
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

To use the git hooks in the repo, which will save you from waiting for CI to tell you that you forgot to lint, run this:

```bash
git config core.hookspath .githooks
```

### Generating changelogs

For changes to be reflected in package changelogs, run `pnpm changeset` and follow the prompts.

### Type changes

If your PR changes the generated types of SvelteKit, run `pnpm generate:types` inside `packages/kit` and commit the new output (don't format it with Prettier!). Review the changes carefully to ensure there are no unwanted changes. If you don't commit type changes, CI will fail.

## Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of changed packages to npm.

New packages will need to be published manually the first time if they are scoped to the `@sveltejs` organisation, by running this from the package directory:

```bash
npm publish --access=public
```
