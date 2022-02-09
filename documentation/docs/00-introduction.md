---
title: Introduction
---

### Before we begin

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](/docs/migrating) for help upgrading from Sapper.

### What is SvelteKit?

SvelteKit is a framework for building extremely high-performance web apps.

Building an app with all the modern best practices is fiendishly complicated. Those practices include [build optimizations](https://vitejs.dev/guide/features.html#build-optimizations), so that you load only the minimal required code; [offline support](/docs/service-workers); [prefetching](/docs/a-options#sveltekit-prefetch) pages before the user initiates navigation; and [configurable rendering](/docs/page-options) that allows you to generate HTML [on the server](/docs/appendix#ssr) or [in the browser](/docs/page-options#router) at runtime or [at build-time](/docs/page-options#prerender). SvelteKit does all the boring stuff for you so that you can get on with the creative part.

It uses [Vite](https://vitejs.dev/) with a [Svelte plugin](https://github.com/sveltejs/vite-plugin-svelte) to provide a lightning-fast and feature-rich development experience with [Hot Module Replacement (HMR)](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#hot), where changes to your code are reflected in the browser instantly.

You don't need to know Svelte to understand the rest of this guide, but it will help. In short, it's a UI framework that compiles your components to highly optimized vanilla JavaScript. Read the [introduction to Svelte blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [Svelte tutorial](https://svelte.dev/tutorial) to learn more.

### Getting started

The easiest way to start building a SvelteKit app is to run `npm init`:

```bash
npm init svelte@next my-app
cd my-app
npm install
npm run dev
```

The first command will scaffold a new project in the `my-app` directory asking you if you'd like to setup some basic tooling such as TypeScript. See the FAQ for [pointers on setting up additional tooling](https://kit.svelte.dev/faq#integrations). The subsequent commands will then install its dependencies and start a server on [localhost:3000](http://localhost:3000).

There are two basic concepts:

- Each page of your app is a [Svelte](https://svelte.dev) component
- You create pages by adding files to the `src/routes` directory of your project. These will be server-rendered so that a user's first visit to your app is as fast as possible, then a client-side app takes over

Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide!

#### Editor setup

We recommend using [Visual Studio Code (aka VS Code)](https://code.visualstudio.com/download) with [the Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode), but [support also exists for numerous other editors](https://sveltesociety.dev/tools#editor-support).
