---
title: Integrations
---

## `vitePreprocess`

[`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) preprocesses `<style>` and `<script>` tags in `.svelte` files.

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    vitePreprocess({
      style: true,      // default value
      script: false     // default value
    })
  ]
};

export default config;
```

### `style`

Use `vitePreprocess()` to enable CSS preprocessors in `<style>` tags: PostCSS, SCSS, Less, Stylus, and SugarSS.

### `script`

Use `vitePreprocess({ script: true })` if: 
- your project is before Svelte 5
- you are using advanced TypeScript features that emit code _(check [`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) documentation)_

> [!NOTE]
TypeScript is supported natively in Svelte 5, so if you are using Svelte 5 and you don't need to use advanced TypeScript features that emit code, you probably don't need to use `vitePreprocess`.

## Add-ons

Run [`npx sv add`](/docs/cli/sv-add) to set up many different complex integrations with a single command including:
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

## Packages

Check out [the packages page](/packages) for a curated set of high quality Svelte packages. You can also see [sveltesociety.dev](https://sveltesociety.dev/) for additional libraries, templates, and resources.

## Additional integrations

### `svelte-preprocess`

`svelte-preprocess` has some additional functionality not found in `vitePreprocess` such as support for Pug, Babel, and global styles. However, `vitePreprocess` may be faster and require less configuration, so it is used by default. Note that CoffeeScript is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit.

You will need to install `svelte-preprocess` with `npm i -D svelte-preprocess` and [add it to your `svelte.config.js`](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md#with-svelte-config). After that, you will often need to [install the corresponding library](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/getting-started.md) such as `npm i -D sass` or `npm i -D less`.

## Vite plugins

Since SvelteKit projects are built with Vite, you can use Vite plugins to enhance your project. See a list of available plugins at [`vitejs/awesome-vite`](https://github.com/vitejs/awesome-vite?tab=readme-ov-file#plugins).

## Integration FAQs

[The SvelteKit FAQ](./faq) answers many questions about how to do X with SvelteKit, which may be helpful if you still have questions.
