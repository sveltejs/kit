---
title: Intégrations
---

## Pré-processeurs

Les pré-processeurs transforment vos fichiers `.svelte` avant de les passer au compilateur. Par exemple, si votre fichier `.svelte` utilise TypeScript et PostCSS, il doit d'abord être transformé en Javascript et CSS afin que le compilateur Svelte puisse le traiter. Il existe plusieurs [pré-processeurs disponibles](https://sveltesociety.dev/packages?category=preprocessors). L'équipe Svelte maintient deux pré-processeurs officiels qui sont décrits ci-dessous.

### `vitePreprocess`

`vite-plugin-svelte` offre une fonctionnalité [`vitePreprocess`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md) qui utilise Vite comme pré-processeur. Il est capable de gérer les différentes nuances de langages que Vite gère : TypeScript, PostCSS, SCSS, Less, Stylus, et SugarSS. Pour des raisons pratiques, ce pré-processeur est ré-exporté depuis le paquet `@sveltejs/kit/vite`. Si vous mettez TypeScript en place dans votre projet, il sera inclus par défaut :

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: [vitePreprocess()]
};
```

### `svelte-preprocess`

`svelte-preprocess` possède des fonctionnalités supplémentaires que `vitePreprocess` ne propose pas, comme le support de Pug, Babel, et les styles globaux. Cependant `vitePreprocess` est généralement plus rapide et demande moins de configuration, il est donc utilisé par défaut. Notez que [CoffeeScript n'est pas supporté](https://github.com/sveltejs/kit/issues/2920#issuecomment-996469815) par SvelteKit.

Vous aurez besoin d'installer `svelte-preprocess` avec `npm install --save-dev svelte-preprocess` et de [l'ajouter à votre fichier `svelte.config.js`](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md#with-svelte-config). Après cela, vous aurez probablement besoin d'[installer la librairie correspondante](https://github.com/sveltejs/svelte-preprocess/blob/main/docs/getting-started.md) avec par exemple `npm install -D sass` ou `npm install -D less`.

## Adders

[Svelte Adders](https://sveltesociety.dev/templates?category=svelte-add) vous permet de mettre en place différentes intégrations complexes comme Tailwind, PostCSS, Storybook, Firebase, GraphQL, mdsvex, et d'autres en une seule commande. Vous trouverez sur [sveltesociety.dev](https://sveltesociety.dev/) une liste complète des <span class='vo'>[templates](PUBLIC_SVELTE_SITE_URL/docs/development#template)</span>, composants, et outils disponibles à l'usage avec Svelte et SvelteKit.

## Plugins Vite

Puisque les projets SvelteKit sont compilés avec Vite, vous pouvez utiliser les <span class='vo'>[plugins](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> Vite pour améliorer votre projet. Vous trouverez sur [`vitejs/awesome-vite`](https://github.com/vitejs/awesome-vite) une liste complète des plugins disponibles.

## FAQ des intégrations

La FAQ de SvelteKit a une section [Comment utiliser X avec SvelteKit](./faq#comment-utiliser-x-avec-sveltekit), qui peut vous aider si vous avez encore des questions.
