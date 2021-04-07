---
title: Introduction
---

### Before we begin

> SvelteKit is in early development, and some things may change before we hit version 1.0. This document is a work-in-progress. If you get stuck, reach out for help in the [Discord chatroom](https://svelte.dev/chat).
>
> See the [migration guides](migrating) for help upgrading from Sapper.

### What is SvelteKit?

SvelteKit is a framework for building extremely high-performance web apps. You're looking at one right now! There are two basic concepts:

* Each page of your app is a [Svelte](https://svelte.dev) component
* You create pages by adding files to the `src/routes` directory of your project. These will be server-rendered so that a user's first visit to your app is as fast as possible, then a client-side app takes over

Building an app with all the modern best practices — code-splitting, offline support, server-rendered views with client-side hydration — is fiendishly complicated. SvelteKit does all the boring stuff for you so that you can get on with the creative part.

You don't need to know Svelte to understand the rest of this guide, but it will help. In short, it's a UI framework that compiles your components to highly optimized vanilla JavaScript. Read the [introductory blog post](https://svelte.dev/blog/svelte-3-rethinking-reactivity) and the [tutorial](https://svelte.dev/tutorial) to learn more.

### Getting started

The easiest way to start building a SvelteKit app is to run `npm init`:

<!---email_off--->
```bash
mkdir my-app
cd my-app
npm init svelte@next
npm install
npm run dev
```
<!---/email_off--->

This will scaffold a new project in the `my-app` directory, install its dependencies, and start a server on [localhost:3000](http://localhost:3000). Try editing the files to get a feel for how everything works – you may not need to bother reading the rest of this guide!
