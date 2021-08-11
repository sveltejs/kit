---
title: Introduction
---



SvelteKit allows you to control rendering and routing on a per-app or per-page basis.

client-side router
static site generator

a development server

The core of SvelteKit provides a highly configurable rendering engine.


- SSR with hydration
future navigation uses client-side router which handles the difficult parts
SSR is enabled by default

- prefetching pages
SvelteKit allows to intelligently prefetch pages just before the user initiates navigation.
no lag as the browser waits for the data to come back from the server.
Typically, this buys us an extra couple of hundred milliseconds, which is the difference between a user interface that feels laggy, and one that feels snappy.
- offline support

Svelte components store some state
Svelte updates the DOM when the state is updated. 

SvelteKit allows SSR
hydrates automatically
all future navigation is CSrouted and CSR

SvelteKit allows to prerender only certain pages (see ?)


client-side router by default

////

SvelteKit is a framework for building extremely high-performance web apps with [Svelte](https://svelte.dev/). You're looking at one right now! Building an app with all the modern best practices is fiendishly complicated. SvelteKit does all the boring stuff for you so that you can get on with the creative part.

### Features

— code-splitting
- [offline support](#service-workers)
- [server-side rendering](#appendix-ssr) with [hydration](#appendix-hydration)


These will be server-rendered so that a user's first visit to your app is as fast as possible, then a client-side app takes over


SvelteKit runtime

SvelteKit uses code splitting to break your app into small chunks (one per route), ensuring fast startup times.


By default, when a user first visits the application, they will be served a server-rendered version of the page in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel where the common portions in the layout do not need to be rerendered.

By default, pages are rendered on both the client and server, though this behaviour is configurable.

By default, SvelteKit will render any component first on the server and send it to the client as HTML. It will then render the component again in the browser to make it interactive in a process called **hydration**. For this reason, you need to ensure that components can run in both places. SvelteKit will then initialise a [**router**](#routing) that takes over subsequent navigations.


This is what SvelteKit's `adapter-static` does.

SvelteKit was not built to do only static site generation and so may not scale as well to efficiently prerender a very large number of pages as tools built specifically for that purpose. However, in contrast to most purpose-built SSGs, SvelteKit does nicely allow for mixing and matching different rendering types on different pages.

You can control each of these on a per-app or per-page basis. Note that each of the per-page settings use [`context="module"`](https://svelte.dev/docs#script_context_module), and only apply to page components, _not_ [layout](#layouts) components.

SvelteKit includes a [client-side router](#appendix-routing) that intercepts navigations (from the user clicking on links, or interacting with the back/forward buttons) and updates the page contents, rather than letting the browser handle the navigation by reloading.

Ordinarily, SvelteKit [hydrates](#appendix-hydration) your server-rendered HTML into an interactive page.
Some pages don't require JavaScript at all — many blog posts and 'about' pages fall into this category.



It's likely that at least some pages of your app can be represented as a simple HTML file generated at build time. These pages can be [_prerendered_](#appendix-prerendering) by your [adapter](#adapters).





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
