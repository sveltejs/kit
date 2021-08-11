---
title: Introduction
---

SvelteKit is an application framework for building web apps using Svelte components. It's the most modern way to build web apps, with full support for serverless platforms, and a great development experience.



SvelteKit is the future of Svelte apps
SvelteKit is the most modern way to build web apps.


SvelteKit fully embraces the serverless paradigm
support multiple platforms
adapters for different serverless platforms


### Features

SvelteKit is a kit of multiple things: a powerful SSR engine, a performant client-side runtime, and a delightful development server.

- [server-side rendering](#appendix-ssr) and [client-side routing](#appendix-routing)

By default, SvelteKit has the best settings enabled.

SSR for the initial page
client-side routing and CSR for subsequent pages

By default, the initial page is rendered on the server (SSR).

By default, pages are rendered on both the client and server

By default, on initial page load, users will be served a server-side rendered version of the page

Pages will be server-side rendered so that a user's initial page load is as fast as possible.

Ordinarily, SvelteKit [hydrates](#appendix-hydration) your server-rendered HTML into an interactive page.
Some pages don't require JavaScript at all — many blog posts and 'about' pages fall into this category.


After the initial page load, a client-side runtime takes over. Further navigation is handled by the client-side router, and further pages are rendered on the client (CSR).

The SvelteKit runtime has a built-in client-side router that takes over after the initial page load of a SSR page.

SvelteKit includes a [client-side router](#appendix-routing)

- [prerendering](#appendix-prerendering)

You can generated at build-time but dynamic ones get rendered at request-time.
using adaptors
It's likely that at least some pages of your app can be represented as a simple HTML file generated at build time. These pages can be [prerendered](#appendix-prerendering) by your [adapter](#adapters).

You can specify which pages can be prerendered and which not on a page-by-page basis.

- highly configurable

You can enable or disable SSR, prerendering and client-side routing on a per-page and per-app basis
SvelteKit allows you to control rendering and routing on a per-app or per-page basis.

- code-splitting for JS and CSS

SvelteKit breaks your app into small chunks (one per route), ensuring fast startup times.

- prefetching pages
SvelteKit allows to intelligently prefetch pages just before the user initiates navigation.
no lag as the browser waits for the data to come back from the server.
Typically, this buys us an extra couple of hundred milliseconds, which is the difference between a user interface that feels laggy, and one that feels snappy.

- Great developer experience

The integrated development server offers hot module reloading and error overlays. Once you experience this way of working, it will ruin you for anything else.

- [offline support](#service-workers)
- TypeScript support



HYDRATION
It will then render the page again in the browser to make it interactive
initialise a [**router**](#routing) that takes over subsequent navigations.

CSrouting
 that intercepts navigations (from the user clicking on links, or interacting with the back/forward buttons) and updates the page contents, rather than letting the browser handle the navigation by reloading.




////////


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
