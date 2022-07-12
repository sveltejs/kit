[![Chat](https://img.shields.io/discord/457912077277855764?label=chat&logo=discord)](https://svelte.dev/chat)

# READ THIS FIRST!

SvelteKit is still in beta. Expect bugs! Read more [here](https://svelte.dev/blog/sveltekit-beta), and track progress towards 1.0 [here](https://github.com/sveltejs/kit/issues?q=is%3Aopen+is%3Aissue+milestone%3A1.0).

## Overview

The Fastest Way to Build Svelte Apps

- 💨 Blazing-Fast Production Sites
- 🛠️ SSR, SPA, SSG, and In-Between
- ⚡️ Instantly Visible Code Changes
- 🔩 Existing Universe of Plugins
- 🔑 Fully Typed APIs

## Documentation

Please see [the documentation](https://kit.svelte.dev/docs) for information about getting started and developing with SvelteKit.

### Packages

| Package                                                                     | Changelog                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [@sveltejs/kit](packages/kit)                                               | [Changelog](packages/kit/CHANGELOG.md)                        |
| [create-svelte](packages/create-svelte)                                     | [Changelog](packages/create-svelte/CHANGELOG.md)              |
| [@sveltejs/adapter-node](packages/adapter-node)                             | [Changelog](packages/adapter-node/CHANGELOG.md)               |
| [@sveltejs/adapter-static](packages/adapter-static)                         | [Changelog](packages/adapter-static/CHANGELOG.md)             |
| [@sveltejs/adapter-cloudflare-workers](packages/adapter-cloudflare-workers) | [Changelog](packages/adapter-cloudflare-workers/CHANGELOG.md) |
| [@sveltejs/adapter-cloudflare](packages/adapter-cloudflare)                 | [Changelog](packages/adapter-cloudflare/CHANGELOG.md)         |
| [@sveltejs/adapter-netlify](packages/adapter-netlify)                       | [Changelog](packages/adapter-netlify/CHANGELOG.md)            |
| [@sveltejs/adapter-vercel](packages/adapter-vercel)                         | [Changelog](packages/adapter-vercel/CHANGELOG.md)             |

The SvelteKit community also makes additional [SvelteKit adapters available for use](https://sveltesociety.dev/components#adapters).

### Migrating from Sapper

Check out the [Migration Guide](https://kit.svelte.dev/docs/migrating) if you are upgrading from Sapper.

## Bug reporting

Please make sure the issue you're reporting involves SvelteKit. Many issues related to how a project builds originate from [Vite](https://vitejs.dev/), which is used to build a SvelteKit project. It's important to note that new Vite projects don't use SSR by default, and so if you create a new Vite project from scratch, many issues won't reproduce. You should thus start with a project that utilizes SSR, such as:

- https://github.com/GrygrFlzr/vite-ssr-d3
- https://github.com/sveltejs/vite-plugin-svelte/tree/main/packages/e2e-tests/vite-ssr

If an issue originates from Vite, please report in the [Vite issue tracker](https://github.com/vitejs/vite/issues).

## Changing SvelteKit locally

See the [Contributing Guide](./CONTRIBUTING.md).

## Supporting Svelte

Svelte is an MIT-licensed open source project with its ongoing development made possible entirely by fantastic volunteers. If you'd like to support their efforts, please consider:

- [Becoming a backer on Open Collective](https://opencollective.com/svelte).

Funds donated via Open Collective will be used for compensating expenses related to Svelte's development such as hosting costs. If sufficient donations are received, funds may also be used to support Svelte's development more directly.

## License

[MIT](https://github.com/sveltejs/kit/blob/master/LICENSE)
