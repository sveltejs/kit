---
title: Introduction
---

## Before we begin

> [!NOTE] If you're new to Svelte or SvelteKit we recommend checking out the [interactive tutorial](/tutorial/kit).
>
> If you get stuck, reach out for help in the [Discord chatroom](/chat).

## What is SvelteKit?

SvelteKit is a framework for rapidly developing robust, performant web applications using [Svelte](../svelte). If you're coming from React, SvelteKit is similar to Next. If you're coming from Vue, SvelteKit is similar to Nuxt.

To learn more about the kinds of applications you can build with SvelteKit, see the [FAQ](faq#What-can-I-make-with-SvelteKit).

## What is Svelte?

In short, Svelte is a way of writing user interface components — like a navigation bar, comment section, or contact form — that users see and interact with in their browsers. The Svelte compiler converts your components to JavaScript that can be run to render the HTML for the page and to CSS that styles the page. You don't need to know Svelte to understand the rest of this guide, but it will help. If you'd like to learn more, check out [the Svelte tutorial](/tutorial).

## SvelteKit vs Svelte

Svelte renders UI components. You can compose these components and render an entire page with just Svelte, but you need more than just Svelte to write an entire app.

SvelteKit helps you build web apps while following modern best practices and providing solutions to common development challenges. It offers everything from basic functionalities — like a [router](glossary#Routing) that updates your UI when a link is clicked — to more advanced capabilities. Its extensive list of features includes [build optimizations](https://vitejs.dev/guide/features.html#build-optimizations) to load only the minimal required code; [offline support](service-workers); [preloading](link-options#data-sveltekit-preload-data) pages before user navigation; [configurable rendering](page-options) to handle different parts of your app on the server via [SSR](glossary#SSR), in the browser through [client-side rendering](glossary#CSR), or at build-time with [prerendering](glossary#Prerendering); [image optimization](images); and much more. Building an app with all the modern best practices is fiendishly complicated, but SvelteKit does all the boring stuff for you so that you can get on with the creative part.

It reflects changes to your code in the browser instantly to provide a lightning-fast and feature-rich development experience by leveraging [Vite](https://vitejs.dev/) with a [Svelte plugin](https://github.com/sveltejs/vite-plugin-svelte) to do [Hot Module Replacement (HMR)](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#hot).
