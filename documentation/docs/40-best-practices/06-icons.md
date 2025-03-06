---
title: Icons
---

## CSS

A great way to use icons is to define them purely via CSS. Iconify offers support for [many popular icon sets](https://icon-sets.iconify.design/) that [can be included via CSS](https://iconify.design/docs/usage/css/). This method may be of particular interest if you're using one of the popular CSS frameworks which Iconify supports and are able to leverage their [Tailwind CSS plugin](https://iconify.design/docs/usage/css/tailwind/) or [UnoCSS plugin](https://iconify.design/docs/usage/css/unocss/). This method is quick and easy to use and doesn't require each icon to be imported in your `.svelte` file like libraries based on Svelte components do.

## Svelte

There are many [icon libraries for Svelte](https://www.sveltesociety.dev/packages?category=icons). When choosing an icon library, it is recommended to avoid those that provide a `.svelte` file per icon as these libraries can have thousands of `.svelte` files which really slow down [Vite's dependency optimization](https://vite.dev/guide/dep-pre-bundling.html). This can become especially pathological if the icons are imported both via an umbrella import and subpath import [as described in the `vite-plugin-svelte` FAQ](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies).
