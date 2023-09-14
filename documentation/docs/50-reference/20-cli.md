---
title: CLI
---

Les projets SvelteKit utilisent [Vite](https://vitejs.dev), ce qui implique que vous utiliserez principalement son <span class='vo'>[CLI](PUBLIC_SVELTE_SITE_URL/docs/development#cli)</span> (même si c'est via des scripts comme `npm run dev/build/preview`) :

- `vite dev` — démarre un serveur de développement
- `vite build` — compile une version de production de votre application
- `vite preview` — démarre la version de production en local

Toutefois SvelteKit possède son propre <span class='vo'>[CLI](PUBLIC_SVELTE_SITE_URL/docs/development#cli)</span> pour initialiser votre projet :

## `svelte-kit sync`

La commande `svelte-kit sync` crée le fichier `tsconfig.json` et tous les types générés (que vous pouvez importer depuis `./types` dans vos fichiers de route) pour votre projet. Lorsque vous créez un nouveau projet, cette commande est incluse dans le script `prepare` et sera automatiquement exécutée dans le cycle de vie de NPM. Vous ne devriez normalement donc pas avoir à exécuter cette commande.

