---
title: Adaptateurs
---

Avant que vous puissiez déployer votre application SvelteKit, vous avez besoin de l'_adapter_ à votre environnement de déploiement cible. Les adaptateurs sont des petits <span class="vo">[plugins](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> qui prennent l'application compilée comme entrée et génèrent en sortie un dossier prêt à être déployé.

Des adaptateurs officiels existent pour plusieurs plateformes – ils sont documentés dans les pages suivantes :
- [`@sveltejs/adapter-cloudflare`](adapter-cloudflare) pour [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [`@sveltejs/adapter-cloudflare-workers`](adapter-cloudflare-workers) pour [Cloudflare Workers](https://workers.cloudflare.com/)
- [`@sveltejs/adapter-netlify`](adapter-netlify) pour [Netlify](https://netlify.com/)
- [`@sveltejs/adapter-node`](adapter-node) pour les serveurs Node
- [`@sveltejs/adapter-static`](adapter-static) pour les générateurs de sites statiques (<span class="vo">[SSG](PUBLIC_SVELTE_SITE_URL/docs/web#ssg)</span>)
- [`@sveltejs/adapter-vercel`](adapter-vercel) pour [Vercel](https://vercel.com/home)

D'autres [adaptateurs gérés par la communauté](https://sveltesociety.dev/packages?category=sveltekit-adapters) (en anglais) existent pour d'autres plateformes.

## Utiliser un adaptateur

Votre adaptateur est précisé dans `svelte.config.js` :

```js
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module 'svelte-adapter-foo' {
	const adapter: (opts: any) => import('@sveltejs/kit').Adapter;
	export default adapter;
}

// @filename: index.js
// ---cut---
import adapter from 'svelte-adapter-foo';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// les options de l'adaptateur se définissent ici
		})
	}
};

export default config;
```

## Contexte spécifique à chaque plateforme

Certains adaptateurs peuvent avoir accès à des informations de requête additionnelles. Par exemple, les "Cloudflare Workers" ont accès à un objet `env` contenant les <span class="vo">[namespaces](PUBLIC_SVELTE_SITE_URL/docs/development#namespace)</span> KV, etc. Ceci peut être passé à un évènement [`RequestEvent`](types#public-types-requestevent) utilisé dans les [hooks](hooks) ainsi qu'aux [routes de serveur](routing#server) comme propriété `platform` – consultez la documentation de chaque adaptateur pour en savoir plus.
