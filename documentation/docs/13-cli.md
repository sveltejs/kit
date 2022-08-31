---
title: Command Line Interface
---

SvelteKit projects use [Vite](https://vitejs.dev), meaning you'll mostly use its CLI (albeit via `npm run dev/build/preview` scripts):

- `vite dev` — start a development server
- `vite build` — build a production version of your app
- `vite preview` — run the production version locally

However SvelteKit includes its own CLI for initialising your project:

### svelte-kit sync

`svelte-kit sync` creates the generated files for your project such as types and a `tsconfig.json`. When you create a new project, it is listed as the `prepare` script and will be run automatically as part of the npm lifecycle, so you should not ordinarily have to run this command.
