---
title: Options de page
---

Par défaut, SvelteKit va effectuer un rendu (ou [un prérendu](glossary#pr-rendu)) de chaque composant d'abord sur le serveur, et l'envoyer au client en tant que HTML. Les composants seront rendus de nouveau dans le navigateur pour les rendre interactifs dans un processus appelé [**hydratation**](glossary#hydratation). Pour cette raison, vous devez vous assurez que vos composants puissent être exécutés dans les deux contextes. SvelteKit va ensuite initialiser un [**routeur**](routing) qui prend la main sur les navigations suivantes.

Vous pouvez contrôler chacune de ces navigations, page par page, en exportant des options depuis [`+page.js`](routing#page-page-js), depuis [`+page.server.js`](routing#page-page-server-js), ou pour des groupes de pages depuis un [`+layout.js`](routing#layout-layout-js) ou un [`+layout.server.js`](routing#layout-layout-server-js) partagé. Pour définir une option s'appliquant à toute votre application, exportez la depuis le <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> racine. Les layouts et pages enfantes écrasent les valeurs d'options définies dans les layouts parents, vous pouvez donc — par exemple — activer le prérendu pour toute votre application, la désactiver pour les pages qui ont besoin d'être rendues dynamiquement.

Vous pouvez définir ces options comme vous le souhaitez à différents endroits de votre application. Par exemple, vous pourriez prérendre votre page marketing pour optimiser la vitesse, faire un rendu serveur de vos pages dynamiques pour le référencement et l'accessibilité, et faire de vos pages d'administration une <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span> en la rendant uniquement dans le navigateur. Cela fait de SvelteKit un outil très polyvalent.

## `prerender`

Il est probable qu'au moins quelques routes de votre application peuvent être représentées comme des simples fichiers HTML générés une fois pour toute à la compilation. Ces routes peuvent être [prérendues](glossary#pr-rendu).

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = true;
```

Vous pouvez également définir `export const prerender = true` dans votre `+layout.js` ou votre `+layout.server.js` racine, et prérendre toutes vos pages sauf celles explicitement définies comme à ne _pas_ prérendre :

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = false;
```

Les routes avec `prerender = true` seront exclues des manifestes utilisés pour le <span class="vo">[SSR](PUBLIC_SVELTE_SITE_URL/docs/web#server-side-rendering)</span> dynamique, vous permettant ainsi de réduire la taille de votre serveur (ou de vos fonctions <span class="vo">[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span>/<span class="vo">[edge](PUBLIC_SVELTE_SITE_URL/docs/web#edge)</span>). Dans certains cas vous pourriez avoir besoin de prérendre une route mais de tout de même l'inclure dans le manifeste (par exemple, avec une route comme `/blog/[slug]` sur laquelle vous voulez prérendre votre contenu le plus récent ou le plus populaire, mais faire des rendus serveur pour le reste) — dans ces cas-là, il y a une troisième option, `'auto'` :

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = 'auto';
```

> Si toute votre application est compatible pour du prérendu, vous pouvez utiliser l'adaptateur [`adapter-static`](https://github.com/sveltejs/kit/tree/main/packages/adapter-static), qui génèrera des fichiers que vous pourrez utiliser avec n'importe quel serveur web statique.

Le prérendu se fait en commençant par la racine de votre application et générer des fichiers pour toute page ou route `+server.js` qu'il trouve. SvelteKit va chercher dans chaque page des éléments `<a>` qui pointent vers d'autres pages potentiellement candidates au prérendu — grâce à ça, vous n'avez en général pas besoin de préciser quelles pages devraient être prérendues. Si vous avez besoin de préciser quelles pages devraient être accessibles par le générateur de prérendus, vous pouvez le faire avec [`config.kit.prerender.entries`](configuration#prerender), ou en exportant une fonction [`entries`](#entries) de votre route dynamique.

Pendant le prérendu, la valeur de `building` importé depuis [`$app/environment`](modules#$app-environment) sera `true`.

### Prérendu des routes de serveur

À la différence des autres options de page, `prerender` s'applique aussi aux fichiers `+server.js`. Ces fichiers ne sont _pas_ affectés par les <span class="vo">[layouts](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>, mais vont hériter des valeurs par défaut des pages qui les utilisent pour requêter leurs données, si elles existent. Par exemple, si un fichier `+page.js` contient cette fonction `load`...

```js
/// file: +page.js
export const prerender = true;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/my-server-route.json');
	return await res.json();
}
```

...alors `src/routes/my-server-route.json/+server.js` sera prérendue, sauf si elle contient son propre `export const prerender = false`.

### Prérendu ou non ?

La règle principale est la suivante : pour qu'une page puisse être prérendue, deux personnes arrivant dessus directement doivent voir le même contenu arriver du serveur.

> Toutes les pages ne sont pas adaptées au prérendu. Tout contenu qui est prérendu sera affiché à tout le monde. Vous pouvez bien sûr requêter des données personnalisées dans une page prérendu en utilisant `onMount`, mais cela pourrait déboucher sur une plus mauvaise expérience utilisateur puisque du contenu vide ou de chargement sera affiché.

Notez que vous pouvez toujours prérendre des pages qui chargent des données en fonction des paramètres de page, comme cette route `src/routes/blog/[slug]/+page.svelte`.

L'accès à [`url.searchParams`](load#utiliser-la-donn-e-d-url-url) durant le prérendu est interdit. Si vous en avez besoin, assurez-vous que vous vous en servez uniquement dans le navigateur (par exemple dans `onMount`).

Les pages avec des [actions de formulaire](form-actions) ne peuvent pas être prérendues, car un serveur est nécessaire pour gérer les requêtes `POST` des actions.

### Conflits de route

Puisque le prérendu écrit dans votre système de fichiers, il n'est pas possible d'avoir deux <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> qui génèreraient un dossier et un fichier avec le même nom. Par exemple, `src/routes/foo/+server.js` et `src/routes/foo/bar/+server.js` vont essayer de créer `foo` et `foo/bar`, ce qui n'est pas possible.

C'est entre autres pour cette raison qu'il est recommandé de toujours inclure une extension de fichier — `src/routes/foo.json/+server.js` et `src/routes/foo/bar.json/+server.js` vont générer des fichiers `foo.json` et `foo/bar.json` ayant le droit de vivre côte-à-côte.

Pour les _pages_, le problème ne se pose pas car SvelteKit écrit des fichiers `foo/index.html` plutôt que `foo`.

### Résolution de problèmes

Si vous rencontrez une erreur qui dit "The following routes were marked as prerenderable, but were not prerendered" ("_Les routes suivantes ont été définies comme candidates au prérendu, mais n'ont pas été prérendues_"), c'est parce que la route en question (ou un <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span> parent si c'est une page) a l'option `export const prerender = true`, mais la page n'a pas été prérendue, parce que elle n'a pas pu être atteinte par le moteur de prérendu.

Puisque ces routes ne peuvent pas être rendues dynamiquement sur le serveur, cela va générer des erreurs pour les gens qui essaieront d'accéder à la route en question. Il y a deux moyens de régler ce problème :

* Assurez-vous que SvelteKit peut trouver la route via des liens en partant de [`config.kit.prerender.entries`](configuration#prerender) ou l'option de page [`entries`](#entries). Ajoutez à cette option des liens aux routes dynamiques (i.e. les pages avec `[parameters]`) si elles ne sont pas découvertes par le moteur via d'autres points d'entrée, sinon elles ne seront pas prérendues car SvelteKit ne sait pas quelle valeur le paramètre doit avoir. Les pages non définies comme candidates au prérendu seront ignorées et leur liens vers d'autres pages ne seront pas utilisées pour trouver d'autres pages, même si potentiellement d'autres seraient concernées.
* Utilisez `export const prerender = 'auto'` plutôt que  `export const prerender = true`. Les routes avec `'auto'` peuvent être dynamiquement rendues sur le serveur.

## `entries`

SvelteKit va découvrir les pages à prérendre automatiquement, en commençant par les _points d'entrée_ et en les parcourant. Par défaut, toutes vos routes non dynamiques sont considérées comme des points d'entrées — par exemple, si vous avez ces routes...

```bash
/             # non dynamique
/blog         # non dynamique
/blog/[slug]  # dynamique, à cause de `[slug]`
```

...SvelteKit va prérendre `/` et `/blog`, et dans le même temps découvrir des liens comme `<a href="/blog/hello-world">` qui lui donnent de nouvelles pages à prérendre.

La plupart du temps, c'est suffisant. Parfois, les liens vers des pages comme `/blog/hello-world` peuvent ne pas exister (ou peuvent ne pas exister sur des pages prérendues), et dans ce cas il est nécessaire d'informer SvelteKit de leur existence.

Nous pouvons faire cela avec [`config.kit.prerender.entries`](configuration#prerender), ou en exportant une fonction `entries` depuis un fichier `+page.js`, `+page.server.js` ou `+server.js` appartenant à une route dynamique :

```js
/// file: src/routes/blog/[slug]/+page.server.js
/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return [
		{ slug: 'hello-world' },
		{ slug: 'another-blog-post' }
	];
}

export const prerender = true;
```

Vous pouvez définir la fonction `entries` comme étant `async`, vous permettant ainsi (par exemple) de récupérer une liste d'articles depuis un <span class="vo">[CMS](PUBLIC_SVELTE_SITE_URL/docs/web#cms)</span> ou une base de données.

## `ssr`

Normalement, SvelteKit construit votre page d'abord sur le serveur, et envoie son HTML au client où il sera [hydraté](glossary#hydratation). Si vous définissez `ssr` à `false`, le serveur va plutôt construire une page "vide". C'est utile si votre page est incapable d'être rendue sur le serveur (parce que vous utilisez des variables globales uniquement définies dans le navigateur comme `document` par exemple), mais dans la plupart des situations ce n'est pas recommandé ([voir l'annexe](glossary#ssr)).

```js
/// file: +page.js
export const ssr = false;
// Si à la fois `ssr` et `csr` sont `false`, rien ne sera construit !
```

Si vous ajoutez `export const ssr = false` à votre fichier `+layout.js` racine, toute votre application sera uniquement rendue sur le client — ce qui signifie que votre application devient une <span class="vo">[SPA](PUBLIC_SVELTE_SITE_URL/docs/web#spa)</span>.

## `csr`

Ordinairement, SvelteKit [hydrate](glossary#hydratation) votre HTML construit côté serveur en une page rendue sur le client ("client-side rendering" ou <span class="vo">[CSR](PUBLIC_SVELTE_SITE_URL/docs/web#client-side-rendering)</span>). Certaines pages n'ont pas du tout besoin de JavaScript — la plupart des articles de blog et des pages "à propos" sont dans ce cas. Vous pouvez alors désactiver le CSR :

```js
/// file: +page.js
export const csr = false;
// Si à la fois `ssr` et `csr` sont `false`, rien ne sera construit !
```

La désactivation du [CSR](glossary#csr) implique qu'aucun JavaScript ne sera envoyé au client. Cela signifie :

* La page web doit être fonctionnelle avec uniquement du HTML et du CSS.
* Les balises `<script>` de tous les composants Svelte sont supprimées.
* Les éléments `<form>` ne peuvent pas être [améliorés progressivement](form-actions#am-lioration-progressive).
* Les liens sont gérés par le navigateur et entraînent une réactualisation complète de la page.

## `trailingSlash`

Par défaut, SvelteKit va retirer les <span class="vo">[trailing slashs](PUBLIC_SVELTE_SITE_URL/docs/web#trailing-slash)</span> de vos URLs — si vous allez sur `/about/`, il va répondre avec une redirection vers `/about`. Vous pouvez changer de comportement avec l'option `trailingSlash`, qui peut avoir comme valeur `'never'` (par défaut), `'always'` ou `'ignore'`.

Comme pour les autres options de page, vous pouvez exporter cette valeur d'un fichier `+layout.js` ou `+layout.server.js`, et elle s'appliquera à toutes les pages enfantes. Vous pouvez aussi exporter cette option depuis des fichiers `+server.js`.

```js
/// file: src/routes/+layout.js
export const trailingSlash = 'always';
```

Cette option impacte aussi le [prérendu](#prerender). Si `trailingSlash` vaut `always`, une route comme `/about` va générer un fichier `about/index.html`, sinon elle génèrera un fichier `about.html`, reflétant les conventions des serveurs web statiques.

> Ignorer les <span class="vo">[trailing slashs](PUBLIC_SVELTE_SITE_URL/docs/web#trailing-slash)</span> n'est pas recommandé — la sémantique des chemins relatifs diffère alors entre les deux cas (`./y` depuis `/x` est `/y`, mais depuis `/x/` c'est `/x/y`), et `/x` et `/x/` seront traitées comme des URLs différentes, ce qui pénalise le référencement.

## `config`

Avec le concept d'[adaptateurs](adapters), SvelteKit est capable d'être exécuté sur différentes plateformes. Chacune peut avoir besoin d'une configuration spécifique pour déclencher le déploiement — par exemple, sur Vercel vous pouvez choisir de déployer certaines parties de votre application sur le réseau <span class="vo">[edge](PUBLIC_SVELTE_SITE_URL/docs/web#edge)</span> et d'autres sur des environnement <span class="vo">[serverless](PUBLIC_SVELTE_SITE_URL/docs/web#serverless)</span>.

`config` est un objet avec des paires clé-valeur à sa racine. À part cette contrainte, sa forme précise dépend de l'adaptateur que vous utilisez. Chaque adaptateur devrait vous fournir une interface `Config` à importer pour vous fournir du typage. Consultez la documentation de votre adaptateur pour plus d'informations.

```js
// @filename: ambient.d.ts
declare module 'some-adapter' {
	export interface Config { runtime: string }
}

// @filename: index.js
// ---cut---
/// file: src/routes/+page.js
/** @type {import('some-adapter').Config} */
export const config = {
	runtime: 'edge'
};
```

Les objets `config` sont fusionnés à la racine de votre application (mais _pas_ dans les niveaux plus profonds). Cela signifie que vous n'avez pas besoin de répéter toutes les valeurs dans un fichier `+page.js` si vous souhaitez uniquement écraser certaines valeurs de la configuration définie dans `+layout.js`. Par exemple, cette configuration de <span class="vo">[layout](PUBLIC_SVELTE_SITE_URL/docs/web#layout)</span>...

```js
/// file: src/routes/+layout.js
export const config = {
	runtime: 'edge',
	regions: 'all',
	foo: {
		bar: true
	}
}
```

...est écrasée par cette configuration de page...

```js
/// file: src/routes/+page.js
export const config = {
	regions: ['us1', 'us2'],
	foo: {
		baz: true
	}
}
```

...qui résulte de cette valeur de configuration `{ runtime: 'edge', regions: ['us1', 'us2'], foo: { baz: true } }` pour cette page.

## Sur le même sujet

- [Tutoriel: Options de page](PUBLIC_LEARN_SITE_URL/tutorial/page-options)
