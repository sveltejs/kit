---
title: Introduction
---

### Before we begin

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](/migrating) for help upgrading from Sapper.

### What is SvelteKit?

SvelteKit is an application framework for building web apps using [Svelte](https://svelte.dev/) components.

With SvelteKit you can build modern state-of-the-art web apps that fully embrace the serverless paradigm with a lightning-fast development experience.

Building an app with all the modern best practices — [server-side rendering](#appendix-ssr) with [client-side hydration](#appendix-hydration), code-splitting, [offline support](#service-workers) — is fiendishly complicated. SvelteKit does all the boring stuff for you so that you can get on with the creative part.

If you're unfamiliar with Svelte read the [introductory blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [tutorial](https://svelte.dev/tutorial) to learn more.

### Features

- [server-side rendering](#appendix-ssr)
    
    The initial page of your app is as fast as possible by serving a server-side rendered version of the page.
  
- [prerendering](#appendix-prerendering) or dynamic server-side rendering

    Server-side rendered pages can be generated at build-time or at request-time.

- [client-side routing](#appendix-routing)

    Subsequent pages are client-side rendered for a fast, app-like feel where the common portions of the pages do not need to be rerendered.

- [highly configurable](#ssr-and-javascript)

    Configurable rendering on a per-page or per-app level.

- [service workers](#service-workers)

    Service workers to make your app work offline or speed up navigation by caching.

- code-splitting for JS and CSS

    Code-splitting so that your app only loads the code needed for a page.

- prefetching

    Prefetch pages before the user initiates navigation.

- hot module reloading

    The [Vite](https://vitejs.dev/) development server has built-in hot module reloading and error overlays so that updates are instantly visible without reloading the page.

- TypeScript

    TypeScript support is built-in.
    
### Getting started

The easiest way to start building a SvelteKit app is to run `npm init`:

```bash
npm init svelte@next my-app
cd my-app
npm install
npm run dev
```

This will scaffold a new project in the `my-app` directory, install its dependencies, and start a server on [localhost:3000](http://localhost:3000). Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide!
