---
title: Génération de site statique
---

Pour utiliser SvelteKit comme un générateur de site statique (SSG), utilisez [`adapter-static`](https://github.com/sveltejs/kit/tree/main/packages/adapter-static).

Ceci va prérendre l'intégralité de votre site comme un collection de fichiers statiques. Si vous préférez prérendre uniquement certaines pages et rendre dynamiquement les autres sur votre serveur, vous aurez besoin d'un adaptateur différent et d'utiliser l'[option de page `prerender`](page-options#prerender).

## Usage

Installez l'adaptateur avec `npm i -D @sveltejs/adapter-static`, puis ajoutez-le à votre fichier `svelte.config.js` :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter({
			// voici les valeurs d'options par défaut.
			// Sur certaines plateformes, ces options
			// seront définies automatiquement – voir plus bas
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		})
	}
};
```

...et ajoutez l'option [`prerender`](page-options#prerender) à votre <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine :

```js
/// file: src/routes/+layout.js
// Cette valeur peut être `false` si vous utilisez le mode SPA
export const prerender = true;
```

> Vous devez vous assurer que l'option de SvelteKit [`trailingSlash`](page-options#trailingslash) est correctement définie pour votre environnement. Si votre hôte ne renvoie pas `/a.html` pour une requête demandant `/a`, vous aurez alors besoin de définir `trailingSlash: 'always'` dans votre <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine pour renvoyer à la place `/a/index.html`.

## Support sans configuration

Certaines plateformes n'ont pas besoin de configuration (d'autres sont à venir) :

- [Vercel](https://vercel.com)

Sur ces plateformes, vous devriez ignorer les options d'adaptateur pour que `adapter-static` soit configuré de manière optimale :

```diff
/// file: svelte.config.js
export default {
	kit: {
-		adapter: adapter({...})
+		adapter: adapter()
	}
};
```

## Options

### `pages`

Le dossier dans lequel écrire les pages prérendues. Il s'agit de `build` par défaut.

### `assets`

Le dossier dans lequel écrire les fichiers statiques (le contenu du dossier `static`, plus les fichiers JS et CSS client générés par SvelteKit). Ce dossier doit normalement être le même que `pages`, et sera par défaut le même que celui défini par l'option `pages`, mais dans de rares circonstances vous pourriez avoir besoin de placer vos pages générées et vos fichiers statiques dans des dossiers différents.

### `fallback`

Définit une page par défaut pour le [mode SPA](single-page-apps), par ex. `index.html`, `200.html` ou `400.html`.

### `precompress`

Si `true`, précompresse les fichiers avec brotli et gzip. Ceci va générer des fichiers `.br` et `.gz`.

### `strict`

Par défaut, `adapter-static` vérifie soit que toutes les pages et <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoints)</span> de votre application sont prérendues, ou que vous avez l'option `fallback` activée. Cela vous permet d'éviter accidentellement de publier une application où certaines parties ne sont pas accessibles, car elles n'ont pas été générées. Si vous savez que tout va bien (par exemple lorsqu'une certaine page n'existe que sous certaines conditions), vous pouvez définir l'option `strict` à `false` pour désactiver cette vérification.

## GitHub Pages

Lorsque vous compilez pour [Github Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages), si le nom de votre projet n'est pas équivalent à `votre-nom.github.io`, assurez-vous de mettre à jour [`config.kit.paths.base`](configuration#paths) pour qu'il corresponde au nom de votre projet Github. Ceci est nécessaire puisque le site sera servi depuis <https://votre-nom.github.io/votre-nom-de-projet> plutôt que depuis la racine.

Il est également utile de générer un page `404.html` de repli pour remplacer la page 404 par défaut qui utilisée par Github Pages.

Une configuration pour Github Pages peut ressembler à ceci :

```js
// @errors: 2307 2322
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		}
	}
};

export default config;
```

Vous pouvez utiliser les Github Actions pour déployer automatiquement votre site sur Github Pages lorsque vous faites un changement. Voici un exemple de <span class="vo">[workflow](PUBLIC_SVELTE_SITE_URL/docs/development#workflow)</span> :

```yaml
### file: .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: 'main'

jobs:
  build_site:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Si vous utilisez pnpm, ajoutez cette étape puis modifiez les commandes la clé de cache
      # ci-dessous pour utiliser `pnpm`
      # - name: Install pnpm
      #   uses: pnpm/action-setup@v3
      #   with:
      #     version: 8

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm install

      - name: build
        env:
          BASE_PATH: '/${{ github.event.repository.name }}'
        run: |
          npm run build

      - name: Upload Artifacts
        uses: actions/upload-pages-artifact@v3
        with:
          # ceci devrait correspondre à l'option `pages` de votre adaptateur
          path: 'build/'

  deploy:
    needs: build_site
    runs-on: ubuntu-latest

    permissions:
      pages: write
      id-token: write

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Si vous n'utilisez pas les Github Actions pour déployer votre site (par exemple, vous publiez le site compilé sur son propre [repository](PUBLIC_SVELTE_SITE_URL/docs/development#repository)), ajoutez un fichier `.nojekyll` dans votre dossier `static` pour empêcher Jekyll d'interférer.
