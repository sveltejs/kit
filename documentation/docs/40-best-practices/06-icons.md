---
title: Icons
---

## CSS

A great way to use icons is to define them purely via CSS. Iconify offers support for [many popular icon sets](https://icon-sets.iconify.design/) that [can be included via CSS](https://iconify.design/docs/usage/css/). This method can also be used with popular CSS frameworks by leveraging the Iconify [Tailwind CSS plugin](https://iconify.design/docs/usage/css/tailwind/) or [UnoCSS plugin](https://iconify.design/docs/usage/css/unocss/). As opposed to libraries based on Svelte components, it doesn't require each icon to be imported into your `.svelte` file.

## Svelte

There are many [icon libraries for Svelte](/packages#icons). When choosing an icon library, it is recommended to avoid those that provide a `.svelte` file per icon, as these libraries can have thousands of `.svelte` files which really slow down [Vite's dependency optimization](https://vite.dev/guide/dep-pre-bundling.html). This can become especially pathological if the icons are imported both via an umbrella import and subpath import [as described in the `vite-plugin-svelte` FAQ](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies).
