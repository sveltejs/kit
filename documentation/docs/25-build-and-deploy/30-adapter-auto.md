---
title: Déploiements sans configuration
---

Lorsque vous créez un nouveau projet SvelteKit avec `npm create svelte@latest`, l'adaptateur [`adapter-auto`](https://github.com/sveltejs/kit/tree/main/packages/adapter-auto) est installé par défaut. Cet adaptateur installe et utilise automatiquement l'adaptateur approprié lorsque vous déployez :

- [`@sveltejs/adapter-cloudflare`](adapter-cloudflare) pour [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [`@sveltejs/adapter-netlify`](adapter-netlify) pour [Netlify](https://netlify.com/)
- [`@sveltejs/adapter-vercel`](adapter-vercel) pour [Vercel](https://vercel.com/)
- [`svelte-adapter-azure-swa`](https://github.com/geoffrich/svelte-adapter-azure-swa) pour [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [`svelte-kit-sst`](https://github.com/serverless-stack/sst/tree/main/packages/svelte-kit-sst) pour [AWS via SST](https://docs.sst.dev/start/svelte)

Nous vous recommandons d'installer en tant que `devDependencies` l'adaptateur approprié une fois que vous avez choisi pour de bon un environnement de déploiement, car cela ajoutera cet adaptateur à votre <span class="vo">[lockfile](PUBLIC_SVELTE_SITE_URL/docs/web#lockfile)</span> et améliorera légèrement les temps d'installation sur votre <span class="vo">[CI](PUBLIC_SVELTE_SITE_URL/docs/development#ci)</span>

## Configuration spécifique à chaque environnement

Pour ajouter des options de configuration, telles que `{ edge: true }` pour [`adapter-vercel`](adapter-vercel) et [`adapter-netlify`](adapter-netlify), vous devez installer l'adaptateur approprié – `adapter-auto` ne prend en compte aucune option.

## Ajouter des adaptateurs communautaires

Pour ajouter à `adapter-auto` le support sans configuration d'un adaptateur communautaire, éditez le fichier [adapters.js](https://github.com/sveltejs/kit/blob/main/packages/adapter-auto/adapters.js) et ouvrez une <span class="vo">[pull request](PUBLIC_SVELTE_SITE_URL/docs/development#pull-request)</span>.
