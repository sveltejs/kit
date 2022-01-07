---
title: Additional Resources
---

### FAQs

Please see the [SvelteKit FAQ](/faq) for solutions to common issues and helpful tips and tricks.

The [Svelte FAQ](https://svelte.dev/faq) and [`vite-plugin-svelte` FAQ](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md) may also be helpful for questions deriving from those libraries.

### Examples

We've written and published a few different SvelteKit sites as examples:

- [The examples directory](https://github.com/sveltejs/kit/tree/master/examples) in the GitHub repo contains a HackerNews clone
- [`sveltejs/realworld`](https://github.com/sveltejs/realworld) contains an example blog site
- [`sveltejs/sites`](https://github.com/sveltejs/sites) contains the code for this site
- [The site directory in the `sveltejs/svelte` repo](https://github.com/sveltejs/svelte/tree/master/site) contains the code for svelte.dev

### Integrations

[`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess) automatically transforms the code in your Svelte templates to provide support for TypeScript, PostCSS, scss/sass, Less, and many other technologies (except CoffeeScript which is [not supported](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) by SvelteKit). The first step of setting it up is to add `svelte-preprocess` to your [`svelte.config.js`](#configuration). It is provided by the template if you're using TypeScript whereas JavaScript users will need to add it. After that, you will often only need to install the corresponding library such as `npm install -D sass` or `npm install -D less`. See the [`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess) docs for more details.

[Svelte Adders](https://sveltesociety.dev/templates#adders) allow you to setup many different complex integrations like Tailwind, PostCSS, Firebase, GraphQL, mdsvex, and more with a single command. Please see [sveltesociety.dev](https://sveltesociety.dev/) for a full listing of templates, components, and tools available for use with Svelte and SvelteKit.

The SvelteKit FAQ also has a [section on integrations](/faq#integrations), which may be helpful if you run into any issues.

### Support

You can ask for help on [Discord](https://svelte.dev/chat) and [StackOverflow](https://stackoverflow.com/questions/tagged/sveltekit). Please first search for information related to your issue in the FAQ, Google or another search engine, issue tracker, and Discord chat history in order to be respectful of others' time. There are many more people asking questions than answering them, so this will help in allowing the community to grow in a scalable fashion.
