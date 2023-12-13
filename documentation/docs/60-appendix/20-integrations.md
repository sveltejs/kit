---
title: Integrations
---

## Preprocessors

Preprocessors transform your `.svelte` files before passing them to the compiler. For example, if your `.svelte` file uses TypeScript and PostCSS, it must first be transformed into JavaScript and CSS so that the Svelte compiler can handle it. There are many [available preprocessors](https://sveltesociety.dev/tools#preprocessors). The Svelte team maintains two official ones discussed below.

### `vitePreprocess`

`vite-plugin-svelte` offers a [`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) feature which utilizes Vite for preprocessing. It is capable of handling the language flavors Vite handles: TypeScript, PostCSS, SCSS, Less, Stylus, and SugarSS. If you set your project up with TypeScript it will be included by default:

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: [vitePreprocess()]
};
```

### `svelte-preprocess`

`svelte-preprocess` has some additional functionality not found in `vitePreprocess` such as support for Pug, Babel, and global styles. However, `vitePreprocess` may be faster and require less configuration, so it is used by default. Note that CoffeeScript is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit.

You will need to install `svelte-preprocess` with `npm install --save-dev svelte-preprocess` and [add it to your `svelte.config.js`](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md#with-svelte-config). After that, you will often need to [install the corresponding library](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/getting-started.md) such as `npm install -D sass` or `npm install -D less`.

## Adders

[Svelte Adders](https://sveltesociety.dev/templates#adders) allow you to setup many different complex integrations like Tailwind, PostCSS, Storybook, Firebase, GraphQL, mdsvex, and more with a single command. Please see [sveltesociety.dev](https://sveltesociety.dev/) for a full listing of templates, components, and tools available for use with Svelte and SvelteKit.

## Vite plugins

Since SvelteKit projects are built with Vite, you can use Vite plugins to enhance your project. See a list of available plugins at [`vitejs/awesome-vite`](https://github.com/vitejs/awesome-vite).

## Integration FAQs

The SvelteKit FAQ has a [how to do X with SvelteKit](./faq#how-do-i-use-x-with-sveltekit), which may be helpful if you still have questions.
