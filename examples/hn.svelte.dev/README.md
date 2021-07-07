# hn.svelte.dev

Hacker News clone built with [Svelte](https://svelte.dev) and [SvelteKit](https://kit.svelte.dev) using the [hnpwa-api](https://github.com/davideast/hnpwa-api) by David East.

## Running locally

This example uses a locally built version of SvelteKit, so you'll first need to build the SvelteKit library by running the following from the SvelteKit root directory:

```bash
pnpm install
pnpm build
```

You can then build an run this example, which will be accessible at [localhost:3000](http://localhost:3000):

```bash
cd examples/hn.svelte.dev
pnpm install
pnpm dev
```

To build and start in prod mode:

```bash
pnpm build
pnpm preview
```
