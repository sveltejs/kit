---
title: Structure du project
---

Un projet typique SvelteKit ressemble à ceci :

```bash
my-project/
├ src/
│ ├ lib/
│ │ ├ server/
│ │ │ └ [vos fichiers spécifiques serveur]
│ │ └ [vos fichiers utilitaires]
│ ├ params/
│ │ └ [vos validateurs de paramètres]
│ ├ routes/
│ │ └ [vos routes]
│ ├ app.html
│ ├ error.html
│ ├ hooks.client.js
│ ├ hooks.server.js
│ └ service-worker.js
├ static/
│ └ [vos fichiers statiques]
├ tests/
│ └ [vos tests]
├ package.json
├ svelte.config.js
├ tsconfig.json
└ vite.config.js
```

Vous trouverez aussi des fichiers classiques comme `.gitignore` et `.npmrc` (et `.prettierrc` et `.eslintrc.cjs` etc., si vous choisissez ces options lors de l'exécution de `npm create svelte@latest`).

## Fichiers de projet

### src

Le dossier `src` contient le coeur de votre projet. Tout est optionnel, à l'exception de `src/routes` et `src/app.html`.

- `lib` contient votre code de bibliothèque (utilitaires et composants), qui peut être importé via l'alias [`$lib`](modules#$lib) alias, ou <span class="vo">[packagé](PUBLIC_SVELTE_SITE_URL/docs/web#bundler-packager)</span> pour être distribué en utilisant [`svelte-package`](packaging)
	- `server` contient votre code de bibliothèque spécifique au serveur. Il peut être importé via l'alias [`$lib/server`](server-only-modules). SvelteKit vous empêchera d'importer ces fichiers dans du code client
- `params` contient les [validateurs de paramètres](advanced-routing#fonctions-match) dont votre application a besoin
- `routes` contient les [routes](routing) de votre application. Vous pouvez aussi y placer des composants qui ne sont utilisés que dans une seule route
- `app.html` est votre <span class="vo">[template](PUBLIC_SVELTE_SITE_URL/docs/development#template)</span> de page — un document HTML contenant les emplacements réservés suivants :
  - `%sveltekit.head%` — les éléments `<link>` et `<script>` requis par votre application, ainsi que le contenu `<svelte:head>` éventuel
  - `%sveltekit.body%` — le <span class="vo">[markup](PUBLIC_SVELTE_SITE_URL/docs/web#markup)</span> d'une page. Ce contenu devrait être placé à l'intérieur d'une `<div>` ou tout autre élément, plutôt que directement dans le `<body>`, pour éviter des <span class="vo">[bugs](PUBLIC_SVELTE_SITE_URL/docs/development#bug)</span> liés à certaines extensions navigateurs qui y injectent des éléments qui seront ensuite détruits par le processus d'hydratation. SvelteKit vous préviendra pendant le développement si ce n'est pas le cas
  - `%sveltekit.assets%` — [`paths.assets`](configuration#paths) si précisé, ou un chemin relatif à [`paths.base`](configuration#paths)
  - `%sveltekit.nonce%` — une configuration [CSP](configuration#csp) `nonce` pour les scripts et liens manuellement inclus, si nécessaire
  - `%sveltekit.env.[NAME]%` - ceci sera remplacé au moment du rendu par la variable d'environnement `[NAME]`, qui doit commencer par le préfixe [`publicPrefix`](configuration#env) (en général `PUBLIC_`). Le défaut `''` sera appliqué si ce n'est pas le cas.
- `error.html` est la page qui est affichée lorsque tout le reste s'écroule. Elle peut contenir les emplacements réservés suivants :
  - `%sveltekit.status%` — le statut HTTP
  - `%sveltekit.error.message%` — le message d'erreur
- `hooks.client.js` contient vos [hooks](hooks) client
- `hooks.server.js` contient vos [hooks](hooks) serveur
- `service-worker.js` contient vos [service workers](service-workers)

(Le fait d'utiliser les extensions de fichier `.js` ou `.ts` dépend de si vous décidez d'utiliser TypeScript lorsque vous créez votre projet. Vous pouvez passer de JavaScript à TypeScript dans la documentation en utilisant le bouton en bas de cette page.)

Si vous avez ajouté [Vitest](https://vitest.dev) à l'installation du projet, vos tests unitaires seront à placer dans le dossier `src` avec une extension `.test.js`.

### static

Tout fichier statique qui doit être servi tel quel, comme `robots.txt` ou `favicon.png`, sont placés ici.

### tests

Si vous avez ajouté [Playwright](https://playwright.dev/) lors de l'installation du projet, afin de tester votre application dans un navigateur, vous devrez placer ces tests dans ce dossier.

### package.json

Votre fichier `package.json` doit inclure `@sveltejs/kit`, `svelte` et `vite` en tant que `devDependencies`.

Lorsque vous créez un projet avec `npm create svelte@latest`, votre `package.json` inclut également `"type": "module"`. Cela signifie que les fichiers `.js` sont interprétés comme des modules JavaScript avec les mots-clés `import` et `export`. Les fichiers utilisant l'ancienne syntaxe CommonJS nécessitent une extension `.cjs`.

### svelte.config.js

Ce fichier contient votre [configuration](configuration) Svelte et SvelteKit.

### tsconfig.json

Ce fichier (ou `jsconfig.json` si vous préférez vérifier le typage dans des fichiers `.js` plutôt que `.ts`) configure TypeScript, si vous avez activé la vérification de type durant `npm create svelte@latest`. Puisque SvelteKit a besoin d'une certaine configuration, il génère son propre fichier `.svelte-kit/tsconfig.json` sur laquelle s'appuie votre propre configuration via `extends`.

### vite.config.js

Un project SvelteKit est en réalité un projet [Vite](https://vitejs.dev) qui utilise le <span class="vo">[plugin](PUBLIC_SVELTE_SITE_URL/docs/development#plugin)</span> [`@sveltejs/kit/vite`](modules#sveltejs-kit-vite) en plus de toute autre [configuration Vite](https://vitejs.dev/config/) éventuelle.

## Autres fichiers

### .svelte-kit

Au fur et à mesure que vous avancerez dans le développement de votre projet, SvelteKit va générer des fichiers dans un dossier `.svelte-kit` (configurable en tant que [`outDir`](configuration#outdir)). Vous pouvez ignorer son contenu, et le supprimer à tout moment (il sera regénéré lors de votre prochaine utilisation de `dev` ou `build`)
