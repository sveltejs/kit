---
title: Integrations
---

## `vitePreprocess`

Including [`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) in your project will allow you to use the various flavors of CSS that Vite supports: PostCSS, SCSS, Less, Stylus, and SugarSS. If you set your project up with TypeScript it will be included by default:

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()]
};

export default config;
```

You will also need to use a preprocessor if you're using TypeScript with Svelte 4. TypeScript is supported natively in Svelte 5 if you're using only the type syntax. To use more complex TypeScript syntax in Svelte 5, you will need still need a preprocessor and can use `vitePreprocess({ script: true })`.

## Adders

Run [`npx sv add`](/docs/cli/sv-add) to setup many different complex integrations with a single command including:
- prettier (formatting)
- eslint (linting)
- vitest (unit testing)
- playwright (e2e testing)
- lucia (auth)
- tailwind (CSS)
- drizzle (DB)
- paraglide (i18n)
- mdsvex (markdown)
- storybook (frontend workshop)

## Directory

See [sveltesociety.dev](https://sveltesociety.dev/) for a full listing of [packages](https://sveltesociety.dev/packages) and [templates](https://sveltesociety.dev/templates) available for use with Svelte and SvelteKit.

## Additional integrations

### `svelte-preprocess`

`svelte-preprocess` has some additional functionality not found in `vitePreprocess` such as support for Pug, Babel, and global styles. However, `vitePreprocess` may be faster and require less configuration, so it is used by default. Note that CoffeeScript is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit.

You will need to install `svelte-preprocess` with `npm i -D svelte-preprocess` and [add it to your `svelte.config.js`](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md#with-svelte-config). After that, you will often need to [install the corresponding library](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/getting-started.md) such as `npm i -D sass` or `npm i -D less`.

## Vite plugins

Since SvelteKit projects are built with Vite, you can use Vite plugins to enhance your project. See a list of available plugins at [`vitejs/awesome-vite`](https://github.com/vitejs/awesome-vite?tab=readme-ov-file#plugins).

## Integration FAQs

[The SvelteKit FAQ](./faq) answers many questions about how to do X with SvelteKit, which may be helpful if you still have questions.
