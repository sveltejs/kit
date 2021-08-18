---
title: Introduction
---

### Before we begin

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](/migrating) for help upgrading from Sapper.

### What is SvelteKit?

SvelteKit is a framework for building extremely high-performance web apps. Building an app with all the modern best practices is fiendishly complicated. Those practices include code-splitting, so that you only load the code needed for a page; [offline support](#service-workers); [prefetching](https://kit.svelte.dev/docs#anchor-options-sveltekit-prefetch) pages before the user initiates navigation; and [configurable rendering](#ssr-and-javascript) that allows you to generate HTML [on the server](#ssr-and-javascript-ssr) or [in the browser](#ssr-and-javascript-router) at runtime or [at build-time](#ssr-and-javascript-prerender). SvelteKit does all the boring stuff for you so that you can get on with the creative part.

And SvelteKit does this all while providing a lightning-fast development experience where changes to your code show up in your browser automatically. We do this by leveraging [Vite](https://vitejs.dev/) with a [Svelte plugin](https://github.com/sveltejs/vite-plugin-svelte), so that [updates are instant and precise without reloading the page or blowing away application state](https://vitejs.dev/guide/features.html#hot-module-replacement).

You don't need to know Svelte to understand the rest of this guide, but it will help. In short, it's a UI framework that compiles your components to highly optimized vanilla JavaScript. Read the [introductory blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [tutorial](https://svelte.dev/tutorial) to learn more.

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

Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide! We recommend using [Visual Studio Code (aka VS Code)](https://code.visualstudio.com/download) with [the Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode), but [support also exists for numerous other editors](https://sveltesociety.dev/tooling#category-Editor%20Extensions).
