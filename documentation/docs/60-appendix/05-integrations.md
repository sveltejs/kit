---
title: Integrations
---

## Preprocessors

Preprocessors transform your `.svelte` files before passing them to the compiler. E.g. if your `.svelte` file uses TypeScript and PostCSS, it must first be transformed into JavaScript and CSS so that the Svelte compiler can handle it. There are many [available preprocessors](https://sveltesociety.dev/tools#preprocessors).

[`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess) automatically transforms the code in your Svelte templates to provide support for TypeScript, PostCSS, scss/sass, Less, and many other technologies (except CoffeeScript which is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit). The first step of setting it up is to add `svelte-preprocess` to your [`svelte.config.js`](/docs/configuration). It is provided by the template if you're using TypeScript whereas JavaScript users will need to add it. After that, you will often only need to install the corresponding library such as `npm install -D sass` or `npm install -D less`. See the [`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess) docs for more details.

`vite-plugin-svelte` also offers a [`useVitePreprocess` option](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#usevitepreprocess) which will utilize Vite for preprocessing which may be faster and require less configuration:

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: [vitePreprocess()]
};
```

## Adders

[Svelte Adders](https://sveltesociety.dev/templates#adders) allow you to setup many different complex integrations like Tailwind, PostCSS, Storybook, Firebase, GraphQL, mdsvex, and more with a single command. Please see [sveltesociety.dev](https://sveltesociety.dev/) for a full listing of templates, components, and tools available for use with Svelte and SvelteKit.

## Integration FAQs

The SvelteKit FAQ has a [section on integrations](/faq#integrations), which may be helpful if you still have questions.
