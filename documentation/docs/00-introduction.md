---
title: Introduction
---

### Before we begin

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](/migrating) for help upgrading from Sapper.

### What is SvelteKit?

SvelteKit is an application framework for building web apps using [Svelte](https://svelte.dev/) components.

With SvelteKit you can build modern state-of-the-art web apps that fully embrace the serverless paradigm with a great development experience.

Building an app with all the modern best practices — [server-side rendering](#appendix-ssr) with [client-side hydration](#appendix-hydration), code-splitting, [offline support](#service-workers) — is fiendishly complicated. SvelteKit does all the boring stuff for you so that you can get on with the creative part.

If you're unfamiliar with Svelte read the [introductory blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [tutorial](https://svelte.dev/tutorial) to learn more.

### Features

- [server-side rendering](#appendix-ssr)
    
    For the initial page, the user is served a server-side rendered version of the page.

- [prerendering](#appendix-prerendering) or dynamic SSR

    The server-side rendered version of a page is prerendered at build-time or rendered dynamically at request-time depending on the [adapter](#adapters) used.

- [client-side routing](#appendix-routing)

    After the initial page load of the server-side rendered page, a client-side runtime takes over. Further navigation to subsequent pages is handled by the client-side router serving a client-side rendered version of the pages.

- [highly configurable](#rendering)

    Rendering can be configured on a per-page or per-app level.

- [service workers](#service-workers)

    Service workers to make a PWA with offline support.

- code-splitting

    Per route code-splitting for JS and CSS.

- prefetching

    Prefetching for pages right before the user initiates navigation.

- tooling

    An integrated development server with built-in hot module reloading and error overlays. TypeScript support out of the box.

### Getting started

The easiest way to start building a SvelteKit app is to run `npm init`:

```bash
npm init svelte@next my-app
cd my-app
npm install
npm run dev
```

This will scaffold a new project in the `my-app` directory, install its dependencies, and start a server on [localhost:3000](http://localhost:3000). Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide!
