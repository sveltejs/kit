---
title: Integrations
---

## `vitePreprocess`

Including [`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) in your project will allow you to use the various flavors of JS and CSS that Vite supports: TypeScript, PostCSS, SCSS, Less, Stylus, and SugarSS. If you set your project up with TypeScript it will be included by default:

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: [vitePreprocess()]
};
```

## Adders

Run `npx svelte-add` to setup many different complex integrations with a single command including:
- CSS - Tailwind, Bootstrap, Bulma
- database - Drizzle ORM
- markdown - mdsvex
- Storybook

## Directory

See [sveltesociety.dev](https://sveltesociety.dev/) for a full listing of [packages](https://sveltesociety.dev/packages) and [templates](https://sveltesociety.dev/templates) available for use with Svelte and SvelteKit.

## Additional integrations

### `svelte-preprocess`

`svelte-preprocess` has some additional functionality not found in `vitePreprocess` such as support for Pug, Babel, and global styles. However, `vitePreprocess` may be faster and require less configuration, so it is used by default. Note that CoffeeScript is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit.

You will need to install `svelte-preprocess` with `npm install --save-dev svelte-preprocess` and [add it to your `svelte.config.js`](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md#with-svelte-config). After that, you will often need to [install the corresponding library](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/getting-started.md) such as `npm install -D sass` or `npm install -D less`.

## Vite plugins

Since SvelteKit projects are built with Vite, you can use Vite plugins to enhance your project. See a list of available plugins at [`vitejs/awesome-vite`](https://github.com/vitejs/awesome-vite?tab=readme-ov-file#plugins).

## Integration FAQs

The SvelteKit FAQ has a [how to do X with SvelteKit](./faq#how-do-i-use-x-with-sveltekit), which may be helpful if you still have questions.
