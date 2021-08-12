---
title: Introduction
---

SvelteKit is an application framework for building web apps using Svelte components.

It's the future of building modern web apps, fully embracing serverless platforms, while providing a great development experience.

It's a *kit* of multiple things: a SSR engine, a client-side runtime, and a development toolchain.

### Features

_If you need a quick explainer on those concepts, check out the appendix._

- [server-side rendering](#appendix-ssr)

For the initial page the user is served a server-side rendered version of the page

- [prerendering](#appendix-prerendering) or dynamic SSR

The server-side rendered version of the page is prerendered at build-time or rendered dynamically at request-time depending on the [adapter](#adapters) used. It can be configured on a per-page level.

- [client-side routing](#appendix-routing)

After the initial page load of the server-side rendered page, a client-side runtime takes over. Further navigation to subsequent pages is handled by the client-side router serving a client-side rendered version of the pages.

- [highly configurable](#rendering)

Rendering can be configured on a per-page or per-app basis.

- code-splitting

Code-splitting for JS and CSS per route.

- prefetching

Pages can be prefetched just before the user initiates navigation.

- Great developer experience

The integrated development server has built-in hot module reloading and error overlays.

- [offline support](#service-workers)
- TypeScript support


If you want to learn more about where SvelteKit came from, read the introduction blog post [What's the deal with SvelteKit?](https://svelte.dev/blog/whats-the-deal-with-sveltekit).


### Getting started

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](/migrating) for help upgrading from Sapper.

The easiest way to start building a SvelteKit app is to run `npm init`:

```bash
npm init svelte@next my-app
cd my-app
npm install
npm run dev
```

This will scaffold a new project in the `my-app` directory, install its dependencies, and start a server on [localhost:3000](http://localhost:3000). Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide!
