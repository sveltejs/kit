---
title: Introduction
---

## Before we begin

> If you're new to Svelte or SvelteKit we recommend checking out the (experimental!) [interactive tutorial](https://learn.svelte.dev).
>
> If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).

## What is SvelteKit?

SvelteKit is a framework for rapid development of robust, performant web applications.

Building an app with all the modern best practices is fiendishly complicated. Those practices include [build optimizations](https://vitejs.dev/guide/features.html#build-optimizations), so that you load only the minimal required code; [offline support](/docs/service-workers); [preloading](/docs/link-options#data-sveltekit-preload-data) pages before the user initiates navigation; [configurable rendering](/docs/page-options) that allows you to render your app [on the server](/docs/glossary#ssr) or [in the browser](/docs/glossary#csr-and-spa) at runtime or [at build-time](/docs/glossary#prerendering), and many other things. SvelteKit does all the boring stuff for you so that you can get on with the creative part.

It uses [Vite](https://vitejs.dev/) with a [Svelte plugin](https://github.com/sveltejs/vite-plugin-svelte) to provide a lightning-fast and feature-rich development experience with [Hot Module Replacement (HMR)](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#hot), where changes to your code are reflected in the browser instantly.

You don't need to know Svelte to understand the rest of this guide, but it will help. In short, it's a UI framework that compiles your components to highly optimized vanilla JavaScript. Read the [introduction to Svelte blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [Svelte tutorial](https://svelte.dev/tutorial) to learn more.
