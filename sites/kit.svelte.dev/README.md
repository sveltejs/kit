# kit.svelte.dev

This is the SvelteKit website. The docs are served via an API and do not live here; they live [alongside the code](https://github.com/sveltejs/kit/tree/master/documentation). Any documentation _content_ improvements should be made as a Pull Request against that repository.

## Developing

This repository uses [`pnpm`](https://pnpm.io/) to manage its dependencies. You will need to have it installed first.

Then, from the root of this repository:

```bash
pnpm i
cd sites/kit.svelte.dev
pnpm dev
```

## Previewing local docs changes

In order to preview local documentation changes, you will need to clone both this repository and the [`kit`](https://github.com/sveltejs/kit) repository, installing the necessary dependencies (by running `pnpm i` in the root of both).

Then, from the root of the `kit` repository run the following command to start a server on `localhost:3456` that will serve the _local_ documentation:

```bash
pnpm preview:docs
```

Then inside this repository and package (`sites/sites/kit.svelte.dev`) run the following command:

```bash
pnpm dev:docs
```

This will start the dev server just as `pnpm dev` does, except it will point at your local version of the documentation. You will then be able to make changes to the documentation in the `kit` repository and see those changes reflected in the locally running site. This _will_ require a hard reload as automatically reloading is not yet supported.
