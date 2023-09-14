import 'svelte'; // pick up `declare module "*.svelte"`
import 'vite/client'; // pick up `declare module "*.jpg"`, etc.
import '../types/ambient.js';

import type { PluginOptions } from '@sveltejs/vite-plugin-svelte';
import { CompileOptions } from 'svelte/compiler';
import { BuildData, SSRNodeLoader, SSRRoute, ValidatedConfig } from 'types';
import {
	AdapterEntry,
	CspDirectives,
	HttpMethod,
	Logger,
	MaybePromise,
	PrerenderEntryGeneratorMismatchHandlerValue,
	PrerenderHttpErrorHandlerValue,
	PrerenderMissingIdHandlerValue,
	PrerenderOption,
	Prerendered,
	RequestOptions,
	RouteSegment
} from '../types/private.js';

export { PrerenderOption } from '../types/private.js';

/**
 * Les [adaptateurs](https://kit.sveltefr.dev/docs/adapters) sont responsables de transformer votre <span class='vo'>[build](https://sveltefr.dev/docs/development#build)</span>
 * de production en quelque chose qui pourra être déployé sur une plateforme de votre choix.
 */
export interface Adapter {
	/**
	 * Le nom de l'adaptateur, utile pour <span class='vo'>[logguer](https://sveltefr.dev/docs/development#log)</span>. Correspond normalement au nom du paquet.
	 */
	name: string;
	/**
	 * Cette fonction est exécutée après que SvelteKit a compilé votre application.
	 * @param builder Un objet fourni par SvelteKit contenant des méthodes pour adpater votre application
	 */
	adapt(builder: Builder): MaybePromise<void>;
	/**
	 * Checks called during dev and build to determine whether specific features will work in production with this adapter
	 */
	supports?: {
		/**
		 * Test support for `read` from `$app/server`
		 * @param config The merged route config
		 */
		read?: (details: { config: any; route: { id: string } }) => boolean;
	};
	/**
	 * Creates an `Emulator`, which allows the adapter to influence the environment
	 * during dev, build and prerendering
	 */
	emulate?(): MaybePromise<Emulator>;
}

export type LoadProperties<input extends Record<string, any> | void> = input extends void
	? undefined // needs to be undefined, because void will break intellisense
	: input extends Record<string, any>
	? input
	: unknown;

export type AwaitedActions<T extends Record<string, (...args: any) => any>> = OptionalUnion<
	{
		[Key in keyof T]: UnpackValidationError<Awaited<ReturnType<T[Key]>>>;
	}[keyof T]
>;

// Takes a union type and returns a union type where each type also has all properties
// of all possible types (typed as undefined), making accessing them more ergonomic
type OptionalUnion<
	U extends Record<string, any>, // not unknown, else interfaces don't satisfy this constraint
	A extends keyof U = U extends U ? keyof U : never
> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;

declare const uniqueSymbol: unique symbol;

export interface ActionFailure<T extends Record<string, unknown> | undefined = undefined> {
	status: number;
	data: T;
	[uniqueSymbol]: true; // necessary or else UnpackValidationError could wrongly unpack objects with the same shape as ActionFailure
}

type UnpackValidationError<T> =
	T extends ActionFailure<infer X>
	? X
	: T extends void
	? undefined // needs to be undefined, because void will corrupt union type
	: T;

/**
 * Cet objet est passé à la fonction `adapt` des adaptateurs.
 * Il contient différentes méthodes et propriétés qui sont utiles pour adapter votre application.
 */
export interface Builder {
	/** Affiche des messages dans la console. `log.info` et `log.minor` sont silencieux à moins que l'option `logLevel` de Vite soit `info`. */
	log: Logger;
	/** Supprime `dir` et tout son contenu. */
	rimraf(dir: string): void;
	/** Crée un dossier `dir` et tout dossier parent nécessaire. */
	mkdirp(dir: string): void;

	/** Le contenu du fichier `svelte.config.js`. */
	config: ValidatedConfig;
	/** Des informations sur les pages prérendues et ses fichiers statiques, s'il y en a. */
	prerendered: Prerendered;
	/** Un tableau de toutes les routes (en incluant les routes prérendues). */
	routes: RouteDefinition[];

	// TODO 3.0 remove this method
	/**
	 * Crée différentes fonctions qui correspondent à une ou plusieurs routes de votre application.
	 * @param fn Une fonction qui regroupe un ensemble de routes en un point d'entrée
	 * @deprecated Utilisez plutôt `builder.routes`
	 */
	createEntries(fn: (route: RouteDefinition) => AdapterEntry): Promise<void>;

	/**
	 * Trouver l'ensemble des fichiers statiques importés par les scripts serveurs appartenant à `routes`.
	 */
	findServerAssets(routes: RouteDefinition[]): string[];

	/**
	 * Generate a fallback page for a static webserver to use when no route is matched. Useful for single-page apps.
	 */
	generateFallback(dest: string): Promise<void>;

	/**
	 * Génère les variables d'environnement à la compilation disponible dans `$env/dynamic/public`.
	 */
	generateEnvModule(): void;

	/**
	 * Génère un manifeste côté serveur avec lequel initialiser le [serveur](https://kit.sveltefr.dev/docs/types#public-types-server) SvelteKit.
	 * @param opts un chemin relatif vers le dossier de base de l'application, et en option le format (esm ou cjs) dans lequel le manifeste doit être généré
	 */
	generateManifest(opts: { relativePath: string; routes?: RouteDefinition[] }): string;

	/**
	 * Résout le chemin vers le fichier `name` dans `outDir`, par ex. `/path/to/.svelte-kit/my-adapter`.
	 * @param name chemin vers le fichier, relatif au dossier compilé
	 */
	getBuildDirectory(name: string): string;
	/** Récupère le chemin résolu complet vers le dossier contenant les fichiers statiques client, incluant le contenu de votre dossier `static`. */
	getClientDirectory(): string;
	/** Récupère le chemin résolu complet vers le dossier contenant le code serveur. */
	getServerDirectory(): string;
	/** Récupère le chemin de l'application en incluant un éventuel chemin configuré par `base`, par ex. `my-base-path/_app`. */
	getAppPath(): string;

	/**
	 * Écrit les fichiers statiques client dans `dest`.
	 * @param dest le dossier de destination
	 * @returns un tableau des fichiers écrits dans `dest`
	 */
	writeClient(dest: string): string[];
	/**
	 * Écrit les fichiers prérendus dans `dest`.
	 * @param dest le dossier de destination
	 * @returns un tableau des fichiers écrits dans `dest`
	 */
	writePrerendered(dest: string): string[];
	/**
	 * Écrit les fichiers prérendus dans `dest`.
	 * @param dest le dossier de destination
	 * @returns un tableau des fichiers écrits dans `dest`
	 */
	writeServer(dest: string): string[];
	/**
	 * Copie un fichier ou un dossier.
	 * @param from le fichier ou dossier source
	 * @param to le fichier ou dossier de destination
	 * @param opts.filter une fonction qui détermine si un fichier ou un dossier doit être copié
	 * @param opts.replace un dictionnaire de chaînes de caractères à remplacer
	 * @returns un tableau des fichiers qui ont été copiés
	 */
	copy(
		from: string,
		to: string,
		opts?: {
			filter?(basename: string): boolean;
			replace?: Record<string, string>;
		}
	): string[];

	/**
	 * Compresse les fichiers dans `directory` avec gzip et brotli, lorsque pertinent. Génère des fichiers `.gz` et `.br` au même endroit que les originaux.
	 * @param {string} directory Le dossier contenant les fichiers à compresser
	 */
	compress(directory: string): Promise<void>;
}

export interface Config {
	/**
	 * Options passed to [`svelte.compile`](https://svelte.dev/docs#compile-time-svelte-compile).
	 * @default {}
	 */
	compilerOptions?: CompileOptions;
	/**
	 * List of file extensions that should be treated as Svelte files.
	 * @default [".svelte"]
	 */
	extensions?: string[];
	/** SvelteKit options */
	kit?: KitConfig;
	/** Preprocessor options, if any. Preprocessing can alternatively also be done through Vite's preprocessor capabilities. */
	preprocess?: any;
	/** `vite-plugin-svelte` plugin options. */
	vitePlugin?: PluginOptions;
	/** Any additional options required by tooling that integrates with Svelte. */
	[key: string]: any;
}

export interface Cookies {
	/**
	 * Récupère un cookie qui a été précédemment défini avec `cookies.set`, ou depuis les <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> de requête.
	 * @param name le nom du cookie
	 * @param opts les options, passées directement à `cookie.parse`. Voir la documentation [sur cette page](https://github.com/jshttp/cookie#cookieparsestr-options) (en anglais).
	 */
	get(name: string, opts?: import('cookie').CookieParseOptions): string | undefined;

	/**
	 * Récupère tous les cookies qui ont été précédemment définis avec `cookies.set`, ou depuis les <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> de requête.
	 * @param opts les options, passées directement à `cookie.parse`. Voir la documentation [sur cette page](https://github.com/jshttp/cookie#cookieparsestr-options) (en anglais).
	 */
	getAll(opts?: import('cookie').CookieParseOptions): Array<{ name: string; value: string }>;

	/**
	 * Définit un cookie. Ceci va ajouter un <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> `set-cookie` à la réponse, mais aussi rendre le cookie disponible via `cookies.get` ou `cookies.getAll` pendant la requête courante.
	 *
	 * Les options `httpOnly` et `secure` valent par défaut `true` (sauf sur http://localhost, où `secure` vaut `false`), et doivent être explicitement désactivées si vous voulez que les cookies soient lisibles par du code JavaScript côté client et/ou transmis via HTTP. L'option `sameSite` vaut par défaut `lax`.
	 *
	 * Vous devez définir un `path` pour les cookies. Dans la plupart des cas, vous devriez explicitement définir `path: '/'` pour rendre le cookie disponible dans toute votre application. Vous pouvez utiliser des chemins relatifs, ou définir `path: ''` pour rendre le cookie disponible à la page courante et ses pages enfants
	 * @param name le nom du cookie
	 * @param value la valeur du cookie
	 * @param opts les options, passées directement à `cookie.serialize`. Voir la documentation [sur cette page](https://github.com/jshttp/cookie#cookieserializename-value-options) (en anglais).
	 */
	set(
		name: string,
		value: string,
		opts: import('cookie').CookieSerializeOptions & { path: string }
	): void;

	/**
	 * Supprime un cookie en définissant sa valeur comme une chaîne de caractères vide et sa date d'expiration à une valeur dans le passé.
	 *
	 * Vous devez définir un `path` pour les cookies. Dans la plupart des cas, vous devriez explicitement définir `path: '/'` pour rendre le cookie disponible dans toute votre application. Vous pouvez utiliser des chemins relatifs, ou définir `path: ''` pour rendre le cookie disponible à la page courante et ses pages enfants
	 * @param name le nom du cookie
	 * @param opts les options, passées directement à `cookie.serialize`. Voir la documentation [ici](https://github.com/jshttp/cookie#cookieserializename-value-options) (en anglais).
	 */
	delete(name: string, opts: import('cookie').CookieSerializeOptions & { path: string }): void;

	/**
	 * Sérialise une paire nom-valeur de cookie en une chaîne de caractères de <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> `Set-Cookie`, mais ne l'applique pas à la réponse.
	 *
	 * Les options `httpOnly` et `secure` valent par défaut `true` (sauf sur http://localhost, où `secure` vaut `false`), et doivent être explicitement désactivées si vous voulez que les cookies soient lisibles par du code JavaScript côté client et/ou transmis via HTTP. L'option `sameSite` vaut par défaut `lax`.
	 *
	 * Vous devez définir un `path` pour les cookies. Dans la plupart des cas, vous devriez explicitement définir `path: '/'` pour rendre le cookie disponible dans toute votre application. Vous pouvez utiliser des chemins relatifs, ou définir `path: ''` pour rendre le cookie disponible à la page courante et ses pages enfants
	 *
	 * @param name le nom du cookie
	 * @param value la valeur du cookie
	 * @param opts les options, passées directement à `cookie.serialize`. Voir la documentation [sur cette page](https://github.com/jshttp/cookie#cookieserializename-value-options) (en anglais).
	 */
	serialize(
		name: string,
		value: string,
		opts: import('cookie').CookieSerializeOptions & { path: string }
	): string;
}

/**
 * A collection of functions that influence the environment during dev, build and prerendering
 */
export interface Emulator {
	/**
	 * A function that is called with the current route `config` and `prerender` option
	 * and returns an `App.Platform` object
	 */
	platform?(details: { config: any; prerender: PrerenderOption }): MaybePromise<App.Platform>;
}

export interface KitConfig {
	/**
	 * * Votre [adaptateur](https://kit.sveltefr.dev/docs/adapters) est ce qui est exécuté lorsque vous lancez `vite build`. Il détermine comment votre projet est compilé selon différentes plateformes.
	 * @default undefined
	 */
	adapter?: Adapter;
	/**
	 * Un objet contenant zéro alias ou plus utilisés pour remplacer des valeurs dans déclarations `import`. Ces alias sont automatiquement passés à Vite et TypeScript.
	 *
	 * ```js
	 * /// file: svelte.config.js
	 * /// type: import('@sveltejs/kit').Config
	 * const config = {
	 *   kit: {
	 *     alias: {
	 *       // ceci va correspondre à un fichier
	 *       'my-file': 'path/to/my-file.js',
	 *
	 *       // ceci va correspondre à un dossier et son contenu
	 *       // (`my-directory/x` va renvoyer vers `path/to/my-directory/x`)
	 *       'my-directory': 'path/to/my-directory',
	 *
	 *       // un alias se terminant par /* va seulement correspondre
	 * 			 // au contenu du dossier, pas au dossier lui-même
	 *       'my-directory/*': 'path/to/my-directory/*'
	 *     }
	 *   }
	 * };
	 * ```
	 *
	 * > L'alias intégré `$lib` est contrôlé par `config.kit.files.lib` puisqu'il est utilisé pour le packaging.
	 *
	 * > Vous aurez besoin de lancer `npm run dev` pour laisser SvelteKit générer automatiquement la configuration d'alias définie par `jsconfig.json` ou `tsconfig.json`.
	 * @default {}
	 */
	alias?: Record<string, string>;
	/**
	 * Le dossier dans lequel SvelteKit génère les fichiers, y compris les fichiers statiques (dont les fichier Javascript et CSS) ainsi que les routes utilisées en interne.
	 *
	 * Si `paths.assets` est spécifié, il y aura deux dossiers plutôt qu'un — `${paths.assets}/${appDir}` et `${paths.base}/${appDir}`.
	 * @default "_app"
	 */
	appDir?: string;
	/**
	 * La configuration [CSP](https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Security-Policy). Les CSP vous aident à protéger vos utilisateurs et utilisatrices contre les attaques <span class='vo'>[XSS](https://sveltefr.dev/docs/web#xss)</span>, en limitant les endroits depuis lesquels les ressources peuvent être téléchargées. Par exemple, une configuration comme celle-ci...
	 *
	 * ```js
	 * /// file: svelte.config.js
	 * /// type: import('@sveltejs/kit').Config
	 * const config = {
	 *   kit: {
	 *     csp: {
	 *       directives: {
	 *         'script-src': ['self']
	 *       },
	 *       reportOnly: {
	 *         'script-src': ['self']
	 *       }
	 *     }
	 *   }
	 * };
	 *
	 * export default config;
	 * ```
	 *
	 * ... empêche les scripts d'être téléchargés depuis des sites externes. SvelteKit ajoute aux directives spécifiées des nonces ou des hashs (en fonction du `mode`) pour tout style <span class='vo'>[inliné](https://sveltefr.dev/docs/web#inline)</span> et script qu'il génère.
	 *
	 * Pour ajouter un nonce aux scripts et links inclus manuellement dans le fichier `src/app.html`, vous pouvez utiliser le <span class='vo'>[placeholder](https://sveltefr.dev/docs/development#placeholder)</span> `%sveltekit.nonce%` (par exemple `<script nonce="%sveltekit.nonce%">`).
	 *
	 * Lorsque les pages sont prérendues, le <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> CSP est ajouté via une balise `<meta http-equiv>` (notez que dans ce cas, les directives `frame-ancestors`, `report-uri` et `sandbox` sont ignorées).
	 *
	 * > Lorsque `mode` vaut `'auto'`, SvelteKit utilise des nonces pour les pages dynamiquement rendues et des hashs pour les pages prérendues. Utiliser des nonces avec des pages prérendues n'est pas sécurisé et donc interdit.
	 *
	 * > Notez que la plupart des [transitions Svelte](https://apprendre.sveltefr.dev/tutorial/transition) fonctionnent en créant un élément `<style>` <span class='vo'>[inliné](https://sveltefr.dev/docs/web#inline)</span>. Si vous les utilisez dans votre application, vous devez soit laisser la directive `style-src` non spécifiée, soit ajouter `unsafe-inline`.
	 *
	 * Si ce niveau de configuration est insuffisant et vous avez des besoins plus dynamiques, vous pouvez utiliser le [hook `handle`](https://kit.sveltefr.dev/hooks#hooks-de-serveur-handle) pour définir vous-même vos CSP.
	 */
	csp?: {
		/**
		 * Mode indiquant d'utiliser des hashs ou des nonces pour restreindre les éléments `<script>` et `<style>`. `'auto'` utilisera les hashs pour les pages prérendues, et des nonces pour les pages rendues dynamiquement.
		 */
		mode?: 'hash' | 'nonce' | 'auto';
		/**
		 * Les directives qui seront ajoutées aux <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> `Content-Security-Policy`.
		 */
		directives?: CspDirectives;
		/**
		 * Les directives qui seront ajoutées aux <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> `Content-Security-Policy-Report-Only`.
		 */
		reportOnly?: CspDirectives;
	};
	/**
	 * Protection contre les attaques de type [CSRF](https://owasp.org/www-community/attacks/csrf).
	 */
	csrf?: {
		/**
		 * Vérifie ou non que le <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> `origin` pour les soumissions de formulaire `POST`, `PUT`, `PATCH` ou `DELETE` correspond à l'origine du serveur.
		 *
		 * Si vous souhaitez que des personnes puissent faire des requêtes `POST`, `PUT`, `PATCH` ou `DELETE` avec un `Content-Type` valant `application/x-www-form-urlencoded`, `multipart/form-data`, ou `text/plain` vers votre application depuis d'autres origines, vous devrez désactiver cette option. Soyez vigilants !
		 * @default true
		 */
		checkOrigin?: boolean;
	};
	/**
	 * Si oui ou non l'application est embarquée dans une application plus grande. Si vaut `true`, SvelteKit ajoute les gestionnaires d'évènements liés à la navigation sur le parent du `%sveltekit.body%` plutôt que sur `window`, et passe les `params` depuis le serveur plutôt que de les inférer depuis `location.pathname`.
	 * Notez que vous ne devriez en général pas embarquer plusieurs applications SvelteKit sur la même page et utiliser les fonctionnalités client (des choses comme la mise à jour de l'historique de navigation supposent qu'il y ait une seule instance par page).
	 * @default false
	 */
	embedded?: boolean;
	/**
	 * Configuration des variables d'environnement
	 */
	env?: {
		/**
		 * Le dossier dans lequel se trouve vos fichiers `.env`.
		 * @default "."
		 */
		dir?: string;
		/**
		 * Un préfixe qui signale qu'une variable d'environnement est exposable en toute sécurité au code client. Voir [`$env/static/public`](https://kit.sveltefr.dev/docs/modules#$env-static-public) et [`$env/dynamic/public`](https://kit.sveltefr.dev/docs/modules#$env-dynamic-public). Notez que le préfixe [`envPrefix`](https://vitejs.dev/config/shared-options.html#envprefix) de Vite doit être défini à part si vous utilisez le gestionnaire de variables d'environnement de Vite – même si l'usage de cette fonctionnalité n'est en général pas nécessaire.
		 * @default "PUBLIC_"
		 */
		publicPrefix?: string;
		/**
		 * Un préfixe qui signale qu'une variable d'environnement n'est pas exposable en toute sécurité au code client. Les variables d'environnement qui ne correspondent ni au préfixe publique ni au préfixe privé seront complètement ignorées. Voir [`$env/static/public`](https://kit.sveltefr.dev/docs/modules#$env-static-public) et [`$env/dynamic/public`](https://kit.sveltefr.dev/docs/modules#$env-dynamic-public).
		 * @default ""
		 * @since 1.21.0
		 */
		privatePrefix?: string;
	};
	/**
	 * Les emplacements de différents fichiers dans votre projet.
	 */
	files?: {
		/**
		 * un endroit pour placer les fichiers statiques qui doivent avoir des URLS stables et n'être soumis à aucun traitement, comme `favicon.ico` ou `manifest.json`
		 * @default "static"
		 */
		assets?: string;
		hooks?: {
			/**
			 * L'emplacement de vos [hooks](https://kit.sveltefr.dev/docs/hooks) client.
			 * @default "src/hooks.client"
			 */
			client?: string;
			/**
			 * L'emplacement de vos [hooks](https://kit.sveltefr.dev/docs/hooks) serveur.
			 * @default "src/hooks.server"
			 */
			server?: string;
			/**
			 * The location of your universal [hooks](https://kit.svelte.dev/docs/hooks).
			 * @default "src/hooks"
			 * @since 2.3.0
			 */
			universal?: string;
		};
		/**
		 * la librairie interne de votre application, accessible dans votre code via `$lib`
		 * @default "src/lib"
		 */
		lib?: string;
		/**
		 * un dossier contenant vos [fonctions `match`](https://kit.sveltefr.dev/docs/advanced-routing#matching)
		 * @default "src/params"
		 */
		params?: string;
		/**
		 * les fichiers qui définissent la structure de votre application (voir [Routing](https://kit.sveltefr.dev/docs/routing))
		 * @default "src/routes"
		 */
		routes?: string;
		/**
		 * l'emplacement du point d'entrée de vos service workers (voir [Service workers](https://kit.sveltefr.dev/docs/service-workers))
		 * @default "src/service-worker"
		 */
		serviceWorker?: string;
		/**
		 * l'emplacement du <span class='vo'>[template](https://sveltefr.dev/docs/development#template)</span> pour les réponses HTML
		 * @default "src/app.html"
		 */
		appTemplate?: string;
		/**
		 * l'emplacement du <span class='vo'>[template](https://sveltefr.dev/docs/development#template)</span> pour les réponses d'erreur de secours
		 * @default "src/error.html"
		 */
		errorTemplate?: string;
	};
	/**
	 * <span class='vo'>[Inline](https://sveltefr.dev/docs/web#inline)</span> le CSS dans un bloc `<style>` en haut du HTML. Cette option est un nombre qui précise la longueur maximale d'un fichier CSS inliné en unités de code UTF-16, comme spécifié par la propriété [String.length](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/String/length). Tous les fichiers CSS requis pour la page plus petits que cette valeur sont fusionnés et inlinés dans un seul bloc `<style>`.
	 *
	 * > Ceci permet de réduire le nombre initial de requêtes et peut améliorer votre score [First Contentful Paint](https://web.dev/first-contentful-paint). Cependant, cela génère des fichiers HTML plus lourds et réduit l'efficacité des caches de navigateur. Servez-vous en avec précaution.
	 * @default 0
	 */
	inlineStyleThreshold?: number;
	/**
	 * Un tableau d'extensions de fichiers que SvelteKit va traiter comme des modules. Les fichiers avec des extensions qui ne correspondent ni à `config.extensions` ni à `config.kit.moduleExtensions` seront ignorés par le routeur.
	 * @default [".js", ".ts"]
	 */
	moduleExtensions?: string[];
	/**
	 * Le dossier dans lequel SvelteKit écrit les fichiers lors de `dev` et `build`. Vous devriez exclure ce dossier de votre contrôle de version.
	 * @default ".svelte-kit"
	 */
	outDir?: string;
	/**
	 * Des options liées au format du dossier de compilation cible
	 */
	output?: {
		/**
		 * SvelteKit va précharger les modules JavaScript nécessaires pour la page initiale pour éviter des "cascades", impliquant un démarrage plus rapide de l'application. Il y a
		 * trois stratégies avec différents compromis :
		 * - `modulepreload` - utilise `<link rel="modulepreload">`. Cette option fournit les meilleurs résultats dans les navigateurs basés sur Chromium, dans Firefox 115+, et Safari 17+. Elle est ignorée dans les navigateurs plus anciens.
		 * - `preload-js` - utilise `<link rel="preload">`. Évite les cascades dans Chromium et Safari, mais Chromium va traiter chaque module deux fois (une fois en tant que script, une fois en tant que module). Implique que les modules sont requêtés deux fois dans Firefox. C'est une bonne option si vous souhaitez maximiser la performance sur les appareils iOS au prix d'une très légère dégradation sur Chromium.
		 * - `preload-mjs` - utilise `<link rel="preload">` mais avec l'extension `.mjs` qui empêche le double traitement par Chromium. Certains serveurs web statiques échoueront à servir les fichiers `.mjs` avec un <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> `Content-Type: application/javascript`, ce qui fera planter votre application. Si ceci ne s'applique pas pour vous, cette option fournira la meilleure performance pour le plus grand nombre de personnes, jusqu'à ce que `modulepreload` soit plus largement supporté.
		 * @default "modulepreload"
		 * @since 1.8.4
		 */
		preloadStrategy?: 'modulepreload' | 'preload-js' | 'preload-mjs';
	};
	paths?: {
		/**
		 * Un chemin absolu depuis lequel les fichiers statiques de votre application sont servis. Ceci est utile si vos fichiers sont servis depuis un espace de stockage.
		 * @default ""
		 */
		assets?: '' | `http://${string}` | `https://${string}`;
		/**
		 * Un chemin relatif à la racine qui doit commencer, mais pas se terminer par `/` (par ex. `/base-path`), à moins que ce ne soit la chaîne de caractères vide. Ceci précise d'où votre application est servie et lui permet d'exister sur un chemin non racine. Notez que vous aurez besoin de préfixer tous vos liens relatifs à la racine avec la valeur de base, au risque de les faire pointer vers la racine de votre domaine, et non vers votre `base` (les navigateurs fonctionnent ainsi). Vous pouvez utiliser [`base` importée depuis `$app/paths`](https://kit.sveltefr.dev/docs/modules#$app-paths-base) pour faire cela: `<a href="{base}/votre-page">Lien</a>`. Si vous devez faire souvent ce remplacement, il peut être utile d'extraire cette logique dans un composant réutilisable.
		 * @default ""
		 */
		base?: '' | `/${string}`;
		/**
		 * Si oui ou non utiliser des chemins de fichiers statiques relatifs.
		 *
		 * Si `true`, `base` et `assets` importées depuis `$app/paths` seront remplacées avec des chemins de fichiers statiques relatifs lors du rendu côté serveur, impliquant du HTML portable.
		 * Si `false`, `%sveltekit.assets%` et les références vers les artefacts de compilation seront toujours des chemins relatifs à la racine, à moins que `paths.assets` soit une URL externe.
		 *
		 * Les pages de fallback des [SPA](https://kit.sveltefr.dev/docs/single-page-apps) utilisera toujours des chemins absolus, quelque soit la valeur de cette configuration.
		 *
		 * Si votre application utilise un élément `<base>`, vous devriez définir cette option à `false`, sinon les URLs de fichiers statiques seront résolues par rapport à `<base>` plutôt que par rapport à la page courante.
		 *
		 * Avec SvelteKit 1.0, `undefined` était une valeur valide, qui était celle par défaut. Dans ce cas, si `paths.assets` n'était pas externe, SvelteKit remplaçait `%sveltekit.assets%` avec un chemin relatif et utilisait des chemins relatifs pour référencer les artéfacts générés ; mais `base` et `assets` importés depuis `$app/paths` étaient résolues comme définis dans votre configuration.
		 *
		 * @default true
		 * @since 1.9.0
		 */
		relative?: boolean;
	};
	/**
	 * Voir la section [Prerendering](https://kit.sveltefr.dev/docs/options-de-page#prerender).
	 */
	prerender?: {
		/**
		 * Nombre de pages pouvant être prérendues simultanément. JS ne s'exécute que sur un seul <span class='vo'>[thread](https://sveltefr.dev/docs/development#thread)</span>, mais dans les cas où la performance de prérendu est liée au réseau (par exemple en chargeant du contenu depuis un <span class='vo'>[CMS](https://sveltefr.dev/docs/web#cms)</span> distant) ceci peut accélérer le processus en effectuant d'autres tâches pendant que les requêtes se terminent.
		 * @default 1
		 */
		concurrency?: number;
		/**
		 * Si oui ou non SvelteKit devrait trouver des pages à prérendre en suivant des liens depuis les entrées `entries`.
		 * @default true
		 */
		crawl?: boolean;
		/**
		 * Un tableau de pages à prérendre, ou depuis lequel commencer à chercher des liens (si `crawl: true`). La chaîne de caractères `*` permet d'inclure toutes les routes non dynamiques (c'est-à-dire les pages sans `[parametres]` ou vide, car SvelteKit ne sait pas d'avance les valeurs que vos paramètres peuvent avoir).
		 * @default ["*"]
		 */
		entries?: Array<'*' | `/${string}`>;
		/**
		 * Comportement de SvelteKit lors d'erreurs HTTP rencontrées pendant le prérendu de l'application.
		 *
		 * - `'fail'` — fait échouer la compilation
		 * - `'ignore'` - ignore l'erreur en silence et continue
		 * - `'warn'` — continue, mais affiche un avertissement
		 * - `(details) => void` — un gestionnaire d'erreur personnalisé qui prend en entrée un objet `details` possédant les propriétés `status`, `path`, `referrer`, `referenceType` et `message`. Si vous utilisez `throw` depuis cette fonction, la compilation échouera
		 *
		 * ```js
		 * /// file: svelte.config.js
		 * /// type: import('@sveltejs/kit').Config
		 * const config = {
		 *   kit: {
		 *     prerender: {
		 *       handleHttpError: ({ path, referrer, message }) => {
		 *         // ignore délibérément le lien vers une page 404
		 *         if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
		 *           return;
		 *         }
		 *
		 *         // sinon fait échouer la compilation
		 *         throw new Error(message);
		 *       }
		 *     }
		 *   }
		 * };
		 * ```
		 *
		 * @default "fail"
		 * @since 1.15.7
		 */
		handleHttpError?: PrerenderHttpErrorHandlerValue;
		/**
		 * Comportement de SvelteKit lorsque les liens d'une page prérendue vers une autre ne correspondent pas à l'`id` de la page cible.
		 *
		 * - `'fail'` — fait échouer la compilation
		 * - `'ignore'` - ignore l'erreur en silence et continue
		 * - `'warn'` — continue, mais affiche un avertissement
		 * - `(details) => void` — un gestionnaire d'erreur personnalisé qui prend en entrée un objet `details` possédant les propriétés `path`, `id`, `referrers` et `message`. Si vous utilisez `throw` depuis cette fonction, la compilation échouera
		 *
		 * @default "fail"
		 * @since 1.15.7
		 */
		handleMissingId?: PrerenderMissingIdHandlerValue;
		/**
		 * Comportement de SvelteKit lorsqu'une entrée générée par l'export `entries` ne correspond pas à la route depuis laquelle elle a été générée.
		 *
		 * - `'fail'` — fait échouer la compilation
		 * - `'ignore'` - ignore l'erreur en silence et continue
		 * - `'warn'` — continue, mais affiche un avertissement
		 * - `(details) => void` — un gestionnaire d'erreur personnalisé qui prend en entrée un objet `details` possédant les propriétés `generatedFromId`, `entry`, `matchedId` et `message`. Si vous utilisez `throw` depuis cette fonction, la compilation échouera
		 *
		 * @default "fail"
		 * @since 1.16.0
		 */
		handleEntryGeneratorMismatch?: PrerenderEntryGeneratorMismatchHandlerValue;
		/**
		 * La valeur de `url.origin` pendant le prérendu ; utile si l'origine est incluse dans le contenu généré.
		 * @default "http://sveltekit-prerender"
		 */
		origin?: string;
	};
	serviceWorker?: {
		/**
		 * Si oui ou non utiliser automatiquement le <span class='vo'>[service worker](https://sveltefr.dev/docs/web#service-worker)</span>, s'il existe.
		 * @default true
		 */
		register?: boolean;
		/**
		 * Détermine quels fichiers de votre dossier `static` seront disponibles dans `$service-worker.files`.
		 * @default (filename) => !/\.DS_Store/.test(filename)
		 */
		files?(filepath: string): boolean;
	};
	typescript?: {
		/**
		 * Une fonction qui permet d'éditer le fichier `tsconfig.json` généré. Vous pouvez muter la configuration (recommandé) ou en renvoyer une nouvelle.
		 * Ceci est utile pour étender un fichier `tsconfig.json` partagé à la racine d'un <span class='vo'>[monorepo](https://sveltefr.dev/docs/development#monorepo)</span>, par exemple.
		 * @default (config) => config
		 * @since 1.3.0
		 */
		config?: (config: Record<string, any>) => Record<string, any> | void;
	};
	/**
	 * Les navigations côté client peuvent être impactées si vous déployez une nouvelle version de votre application pendant que des gens sont en train de l'utiliser. Si le code de la nouvelle page est déjà chargé, il se peut qu'il ait du contenu périmé ; s'il n'est pas encore chargé, le manifeste de routes de votre application peut pointer vers un fichier JavaScript qui n'existe plus.
	 * SvelteKit vous aide à résoudre ce problème via une gestion de version.
	 * Si Sveltekit rencontre une erreur pendant le chargement de la page et détecte qu'une nouvelle version est déployée (en utilisant le `name` spécifié ici, qui par défaut a pour valeur le <span class='vo'>[timestamp](https://sveltefr.dev/docs/development#timestamp)</span> de compilation), il choisit de passer par une navigation traditionnelle qui recharge entièrement la page.
	 * Mais toutes les navigations ne débouchent pas toujours sur une erreur, par exemple si le code JavaScript de la nouvelle page est déjà chargé. Si vous souhaitez toujours forcer une navigation qui recharge toute la page dans ces cas-là, vous pouvez utiliser des techniques telles que définir l'option `pollInterval` puis utiliser `beforeNavigate` :
	 * ```html
	 * /// file: +layout.svelte
	 * <script>
	 *   import { beforeNavigate } from '$app/navigation';
	 *   import { updated } from '$app/stores';
	 *
	 *   beforeNavigate(({ willUnload, to }) => {
	 *     if ($updated && !willUnload && to?.url) {
	 *       location.href = to.url.href;
	 *     }
	 *   });
	 * </script>
	 * ```
	 *
	 * Si vous définissez `pollInterval` comme étant une valeur différente de zéro, SvelteKit va régulièrement vérifier en tâche de fond si une nouvelle version de votre application existe, et mettre la valeur du [store `updated`](https://kit.sveltefr.dev/docs/modules#$app-stores-updated) à `true` s'il détecte une nouvelle version.
	 */
	version?: {
		/**
		 * La version actuelle de votre application. Si précisée, cette valeur doit être déterministe (c'est-à-dire une référence de <span class='vo'>[commit](https://sveltefr.dev/docs/development#commit)</span> plutôt qu'un `Math.random()` ou `Date.now().toString()`). Si non précisée, cette valeur vaut le <span class='vo'>[timestamp](https://sveltefr.dev/docs/development#timestamp)</span> de la dernière compilation.
		 *
		 * Par exemple, pour utiliser le <span class='vo'>[hash](https://sveltefr.dev/docs/development#hash)</span> du dernier <span class='vo'>[commit](https://sveltefr.dev/docs/development#commit)</span>, vous pouvez utiliser `git rev-parse HEAD` :
		 *
		 * ```js
		 * /// file: svelte.config.js
		 * import * as child_process from 'node:child_process';
		 *
		 * export default {
		 *   kit: {
		 *     version: {
		 *       name: child_process.execSync('git rev-parse HEAD').toString().trim()
		 *     }
		 *   }
		 * };
		 * ```
		 */
		name?: string;
		/**
		 * Un intervalle en millisecondes pour vérifier l'existence de nouvelles version. Si cette valeur vaut `0`, aucune vérification n'est faite.
		 * @default 0
		 */
		pollInterval?: number;
	};
}

/**
 * Le [hook `handle`](https://kit.sveltefr.dev/docs/hooks#server-hooks-handle) est exécuté à chaque fois que le serveur SvelteKit reçoit une [requête](https://kit.sveltefr.dev/docs/web-standards#fetch-apis-request)
 * et détermine la [réponse](https://kit.sveltefr.dev/docs/web-standards#fetch-apis-response).
 * Il reçoit un objet `event` représentant la requête et un fonction appelée `resolve`, qui rend la route et génère une `Response`.
 * Ceci vous permet de modifier les <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> et <span class='vo'>[body](https://sveltefr.dev/docs/web#body)</span> de réponse,
 * ou de complètement contourner SvelteKit (par exemple pour implémenter certaines routes programmatiquement).
 */
export type Handle = (input: {
	event: RequestEvent;
	resolve(event: RequestEvent, opts?: ResolveOptions): MaybePromise<Response>;
}) => MaybePromise<Response>;

/**
 * Le <span class='vo'>[hook](https://sveltefr.dev/docs/sveltejs#hook)</span> [`handleError`](https://kit.sveltefr.dev/docs/hooks#hooks-partag-s-handleerror) est exécuté sur le serveur lorsqu'une erreur inattendue se produit pendant que SvelteKit répond à une requête.
 *
 * Si une erreur inattendue est levée pendant le chargement ou le rendu, cette fonction est appelée avec l'erreur et un objet `RequestEvent`.
 * Assurez-vous que cette fonction ne lève _jamais_ d'erreur.
 */
export type HandleServerError = (input: {
	error: unknown;
	event: RequestEvent;
	status: number;
	message: string;
}) => MaybePromise<void | App.Error>;

/**
 * Le <span class='vo'>[hook](https://sveltefr.dev/docs/sveltejs#hook)</span> [`handleError`](https://kit.sveltefr.dev/docs/hooks#hooks-partag-s-handleerror) est exécuté côté client lorsqu'une erreur inattendue se produit pendant la navigation.
 *
 *
 * Si une erreur inattendue est levée pendant le chargement ou après le rendu, cette fonction est appelée avec l'erreur et un objet `RequestEvent`.
 * Assurez-vous que cette fonction ne lève _jamais_ d'erreur.
 */
export type HandleClientError = (input: {
	error: unknown;
	event: NavigationEvent;
	status: number;
	message: string;
}) => MaybePromise<void | App.Error>;

/**
 * Le <span class='vo'>[hook](https://sveltefr.dev/docs/sveltejs#hook)</span> [`handleFetch`](https://kit.sveltefr.dev/docs/hooks#server-hooks-handlefetch) vous permet de modifier (ou remplacer) une requête `fetch` qui se produit dans une fonction `load` exécutée sur le serveur (ou durant le prérendu).
 */
export type HandleFetch = (input: {
	event: RequestEvent;
	request: Request;
	fetch: typeof fetch;
}) => MaybePromise<Response>;

/**
 * The [`reroute`](https://kit.svelte.dev/docs/hooks#universal-hooks-reroute) hook allows you to modify the URL before it is used to determine which route to render.
 * @since 2.3.0
 */
export type Reroute = (event: { url: URL }) => void | string;

/**
 * La forme générique de `PageLoad` et `LayoutLoad`. Vous devriez importer ces derniers depuis `./$types` (voir la section [Types générés](https://kit.sveltefr.dev/docs/types#generated-types))
 * plutôt que d'utiliser `Load` directement.
 */
export type Load<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	InputData extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	OutputData extends Record<string, unknown> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> = (event: LoadEvent<Params, InputData, ParentData, RouteId>) => MaybePromise<OutputData>;

/**
 * La forme générique de `PageLoadEvent` et `LayoutLoadEvent`. Vous devriez importer ces derniers depuis `./$types` (voir la section [Types générés](https://kit.sveltefr.dev/docs/types#generated-types))
 * plutôt que d'utiliser `LoadEvent` directement.
 */
export interface LoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	Data extends Record<string, unknown> | null = Record<string, any> | null,
	ParentData extends Record<string, unknown> = Record<string, any>,
	RouteId extends string | null = string | null
> extends NavigationEvent<Params, RouteId> {
	/**
	 * La méthode `fetch` est équivalente à l'[API web native `fetch`](https://developer.mozilla.org/fr/docs/Web/API/fetch), avec quelques fonctionnalités additionnelles :
	 *
	 * - Vous pouvez l'utiliser pour faire des requêtes authentifiées sur le serveur, puisqu'elle hérite des <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> `cookie` et `authorization` de la requête de page.
	 * - Elle peut faire des requêtes relatives sur votre serveur (d'habitude, `fetch` nécessite une URL avec une origine lorsqu'utilisée dans un contexte serveur).
	 * - Les requêtes internes (par ex. vers des routes `+server.js`) vont directement vers la fonction concernée si `fetch` est exécutée sur le serveur, sans la surcharge d'une requête HTTP.
	 * - Pendant le rendu côté serveur, la réponse est capturée et <span class='vo'>[inlinée](https://sveltefr.dev/docs/javascript#inline)</span> dans le HTML rendu en utilisant les méthodes `text` et `json` de l'objet `Response`. Notez que les <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> ne seront _pas_ sérialisés, à moins d'être inclus explicitement via [`filterSerializedResponseHeaders`](https://kit.sveltefr.dev/docs/hooks#hooks-de-serveur-handle)
	 * - Pendant l'hydratation, la réponse est lue depuis le HTML, en garantissant la cohérence et évitant une requête réseau supplémentaire.
	 *
	 * Vous pouvez en apprendre plus sur les requêtes authentifiées avec cookies [ici](https://kit.sveltefr.dev/docs/load#cookies).
	 */
	fetch: typeof fetch;
	/**
	 * Contient les données renvoyées par la fonction `load` serveur de votre route (dans `+layout.server.js` ou `+page.server.js`), si elle existe.
	 */
	data: Data;
	/**
	 * Si vous avez besoin de définir des <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> de réponse, vous pouvez le faire en utilisant cette méthode. Cela est utile si vous souhaitez changer la page à mettre en cache, par exemple :
	 *
	 *	```js
	 *	/// file: src/routes/blog/+page.js
	 *	export async function load({ fetch, setHeaders }) {
	 *		const url = `https://cms.example.com/articles.json`;
	 *		const response = await fetch(url);
	 *
	 *		setHeaders({
	 *			age: response.headers.get('age'),
	 *			'cache-control': response.headers.get('cache-control')
	 *		});
	 *
	 *		return response.json();
	 *	}
	 *	```
	 *
	 * Définir le même <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> plusieurs fois (même dans des fonctions `load` différentes) est une erreur – vous pouvez définir un header donné seulement une seule fois.
	 * Vous ne pouvez pas ajouter un header `set-cookie` en même temps que vous utilisez `setHeaders` – utilisez plutôt l'<span class='vo'>[API](https://sveltefr.dev/docs/development#api)</span> [`cookies`](https://kit.sveltefr.dev/docs/types#public-types-cookies) dans une fonction `load` de serveur.
	 *
	 * `setHeaders` n'a pas d'effet lorsque la fonction `load` est exécutée dans le navigateur.
	 */
	setHeaders(headers: Record<string, string>): void;
	/**
	 * `await parent()` renvoie les données des fonctions `load` des fichiers `+layout.js` parents.
	 * Implicitement, un fichier `+layout.js` manquant est traité comme une fonction `({ data }) => data`, ce qui implique qu'elle va relayer les données des fichiers `+layout.server.js` parents.
	 *
	 * Faites attention à ne pas introduire de "cascade" de chargement accidentelle lorsque vous utilisez `await parent()`. Si par exemple vous voulez uniquement fusionner les données du parent dans un objet à renvoyer, appelez cette fonction _après_ avoir téléchargé vos autres données.
	 */
	parent(): Promise<ParentData>;
	/**
	 * Cette fonction déclare que la fonction `load` a comme _dépendances_ une ou plusieurs URLs ou identifiants personnalisés, qui peuvent donc être utilisés avec [`invalidate()`](https://kit.sveltefr.dev/docs/modules#$app-navigation-invalidate) pour déclencher la réexécution de la méthode `load`.
	 *
	 * La plupart du temps vous n'avez pas besoin d'utiliser ceci, puisque `fetch` appelle `depends` pour vous – c'est uniquement nécessaire si vous utilisez un client d'<span class='vo'>[API](https://sveltefr.dev/docs/development#api)</span> personnalisé qui contourne `fetch`.
	 *
	 * Les URLs peuvent être absolues ou relatives à la page qui est en train d'être chargée, et doivent être [encodées](https://developer.mozilla.org/fr/docs/Glossary/percent-encoding).
	 *
	 * Les identifiants personnaliés doivent être préfixés avec une ou plusieurs lettres en minuscules suivies d'un `:` pour satisfaire la [spécification URI](https://www.rfc-editor.org/rfc/rfc3986.html).
	 *
	 * L'exemple suivant vous montre comment utiliser `depends` pour déclarer une dépendance à un identifiant personnalisé, qui sera invalidé  avec `invalidate` après un clic sur un bouton, déclenchant la réexécution de la fonction `load`.
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * let count = 0;
	 * export async function load({ depends }) {
	 * 	depends('increase:count');
	 *
	 * 	return { count: count++ };
	 * }
	 * ```
	 *
	 * ```html
	 * /// file: src/routes/+page.svelte
	 * <script>
	 * 	import { invalidate } from '$app/navigation';
	 *
	 * 	export let data;
	 *
	 * 	const increase = async () => {
	 * 		await invalidate('increase:count');
	 * 	}
	 * </script>
	 *
	 * <p>{data.count}<p>
	 * <button on:click={increase}>Augmenter le compteur</button>
	 * ```
	 */
	depends(...deps: Array<`${string}:${string}`>): void;
	/**
	 * Use this function to opt out of dependency tracking for everything that is synchronously called within the callback. Example:
	 *
	 * ```js
	 * /// file: src/routes/+page.server.js
	 * export async function load({ untrack, url }) {
	 * 	// Untrack url.pathname so that path changes don't trigger a rerun
	 * 	if (untrack(() => url.pathname === '/')) {
	 * 		return { message: 'Welcome!' };
	 * 	}
	 * }
	 * ```
	 */
	untrack<T>(fn: () => T): T;
}

export interface NavigationEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> {
	/**
	 * Les paramètres de la page courante – par ex. un objet `{ slug: string }` pour la route `/blog/[slug]`
	 */
	params: Params;
	/**
	 * Des informations sur la route courante
	 */
	route: {
		/**
		 * L'ID de la route courante – par ex. `/blog/[slug]` pour la route `src/routes/blog/[slug]`
		 */
		id: RouteId;
	};
	/**
	 * L'URL de la page courante
	 */
	url: URL;
}

/**
 * Des informations sur la cible d'une navigation.
 */
export interface NavigationTarget {
	/**
	 * Les paramètres de la page cible – pax ex. un objet `{ slug: string }` pour la route `/blog/[slug]`.
	 * Vaut `null` si la cible ne fait pas partie de votre application SvelteKit (car ne correspond à aucune de vos routes).
	 */
	params: Record<string, string> | null;
	/**
	 * Des informations sur la route cible
	 */
	route: { id: string | null };
	/**
	 * L'URL vers laquelle la navigation se dirige
	 */
	url: URL;
}

/**
 * - `enter`: L'application a été hydratée
 * - `form`: Un élément `<form>` a été soumis avec une méthode GET
 * - `leave`: L'utilisateur ou utilisatrice quitte l'application en fermant l'onglet ou en utilisant les boutons retour/suivant du navigateur pour aller sur un document différent
 * - `link`: La navigation a été déclenchée par un clic sur un lien
 * - `goto`: La navigation a été déclenchée par un appel à `goto(...)` ou une redirection
 * - `popstate`: La navigation a été déclenchée par une navigation avec les boutons retour/suivant du navigateur
 */
export type NavigationType = 'enter' | 'form' | 'leave' | 'link' | 'goto' | 'popstate';

export interface Navigation {
	/**
	 * L'endroit d'où la navigation a été déclenchée
	 */
	from: NavigationTarget | null;
	/**
	 * L'endroit vers lequel la navigation est dirigée
	 */
	to: NavigationTarget | null;
	/**
	 * Le type de navigation :
	 * - `form`: Un élément `<form>` a été soumis
	 * - `leave`: L'utilisateur ou utilisatrice quitte l'application en fermant l'onglet ou en naviguant vers un document différent
	 * - `link`: La navigation a été déclenchée par un clic sur un lien
	 * - `goto`: La navigation a été déclenchée par un appel à `goto(...)` ou une redirection
	 * - `popstate`: La navigation a été déclenchée par un navigation avec les boutons retour/suivant du navigateur
	 */
	type: Exclude<NavigationType, 'enter'>;
	/**
	 * Si oui ou non la navigation va déclencher le déchargement de la page (c'est-à-dire pas une navigation client)
	 */
	willUnload: boolean;
	/**
	 * Dans les cas d'une navigation via les boutons retour/suivant du navigateur, le nombre d'étapes vers l'avant ou l'arrière de l'historique
	 */
	delta?: number;
	/**
	 * Un promesse qui se résout une fois la navigation terminée, et qui est rejetée si la navigation
	 * échoue ou est annulée. Dans le cas d'une navigation de type `willUnload`, la promise ne sera jamais résolue
	 */
	complete: Promise<void>;
}

/**
 * L'argument passé aux <span class='vo'>[callbacks](https://sveltefr.dev/docs/development#callback)</span> [`beforeNavigate`](https://kit.svelte.dev/docs/modules#$app-navigation-beforenavigate).
 */
export interface BeforeNavigate extends Navigation {
	/**
	 * Appelez cette méthode pour empêcher la navigation de démarrer.
	 */
	cancel(): void;
}

/**
 * L'argument passé aux <span class='vo'>[callbacks](https://sveltefr.dev/docs/development#callback)</span> [`onNavigate`](https://kit.svelte.dev/docs/modules#$app-navigation-onnavigate).
 */
export interface OnNavigate extends Navigation {
	/**
	 * Le type de navigation :
	 * - `form`: L'utilisateur ou utilisatrice a soumis un `<form>`
	 * - `link`: La navigation a été déclenchée par un clic sur un lien
	 * - `goto`: La navigation a été déclenchée par un appel à `goto(...)` ou une redirection
	 * - `popstate`: La navigation a été déclenchée par les boutons précédent/suivant du navigateur
	 */
	type: Exclude<NavigationType, 'enter' | 'leave'>;
	/**
	 * Puisque les <span class='vo'>[callbacks](https://sveltefr.dev/docs/development#callback)</span> `onNavigate` sont exécutés immédiatement avant une navigation côté client, ils ne seront jamais appelés lorsqu'une navigation décharge la page.
	 */
	willUnload: false;
}

/**
 * L'argument passé aux <span class='vo'>[callbacks](https://sveltefr.dev/docs/development#callback)</span> [`afterNavigate`](https://kit.sveltefr.dev/docs/modules#$app-navigation-afternavigate).
 */
export interface AfterNavigate extends Omit<Navigation, 'type'> {
	/**
	 * Le type de navigation :
	 * - `enter`: L'application a été hydratée
	 * - `form`: L'utilisateur ou utilisatrice a soumis un `<form>`
	 * - `link`: La navigation a été déclenchée par un clic sur un lien
	 * - `goto`: La navigation a été déclenchée par un appel à `goto(...)` ou une redirection
	 * - `popstate`: La navigation a été déclenchée par les boutons précédent/suivant du navigateur
	 */
	type: Exclude<NavigationType, 'leave'>;
	/**
	 * Puisque les <span class='vo'>[callbacks](https://sveltefr.dev/docs/development#callback)</span> `afterNavigate` sont exécutés après la fin d'une navigation, ils ne seront jamais appelés lorsqu'une navigation décharge la page.
	 */
	willUnload: false;
}

/**
 * La forme du <span class='vo'>[store](https://sveltefr.dev/docs/sveltejs#store)</span> `$page`
 */
export interface Page<
	Params extends Record<string, string> = Record<string, string>,
	RouteId extends string | null = string | null
> {
	/**
	 * L'URL de la page courante
	 */
	url: URL;
	/**
	 * Les paramètres de la page courante – par ex. un objet `{ slug: string }` pour la route `/blog/[slug]`
	 */
	params: Params;
	/**
	 * Des informations sur la route courante
	 */
	route: {
		/**
		 * L'ID de la route courante – par ex. `/blog/[slug]` pour la route `src/routes/blog/[slug]`
		 */
		id: RouteId;
	};
	/**
	 * Le code de statut HTTP pour la page courante
	 */
	status: number;
	/**
	 * L'objet d'erreur pour la page courante, si pertinent. Rempli grâce aux <span class='vo'>[hooks](https://sveltefr.dev/docs/sveltejs#hook)</span> `handleError`.
	 */
	error: App.Error | null;
	/**
	 * Le résultat de la fusion de toutes les données renvoyées par toutes les fonctions `load` de la page courante. Vous pouvez typer un dénominateur commun grâce à `App.PageData`.
	 */
	data: App.PageData & Record<string, any>;
	/**
	 * L'état de la page, qui peut être manipulé avec les fonctions [`pushState`](https://kit.sveltefr.dev/docs/modules#$app-navigation-pushstate) et [`replaceState`](https://kit.sveltefr.dev/docs/modules#$app-navigation-replacestate) importées depuis `$app/navigation`.
	 */
	state: App.PageState;
	/**
	 * Rempli uniquement après la soumission d'un formulaire. Voir la section sur les [actions de formulaire](https://kit.sveltefr.dev/docs/form-actions) pour plus d'informations.
	 */
	form: any;
}

/**
 * La forme d'une fonction `match`. Voir la section sur les [fonctions `match`](https://kit.svelte.dev/docs/advanced-routing#fonctions-match) pour plus d'informations.
 */
export type ParamMatcher = (param: string) => boolean;

export interface RequestEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> {
	/**
	 * Définit ou récupère les cookies liés à la requête courante
	 */
	cookies: Cookies;
	/**
	 * La méthode `fetch` est équivalente à l'[API web native `fetch`](https://developer.mozilla.org/fr/docs/Web/API/fetch), avec quelques fonctionnalités additionnelles :
	 *
	 * - Vous pouvez l'utiliser pour faire des requêtes authentifiées sur le serveur, puisqu'elle hérite des <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> `cookie` et `authorization` de la requête de page.
	 * - Elle peut faire des requêtes relatives sur votre serveur (d'habitude, `fetch` nécessite une URL avec une origine lorsqu'utilisée dans un contexte serveur).
	 * - Les requêtes internes (par ex. vers des routes `+server.js`) vont directement vers la fonction concernée si `fetch` est exécutée sur le serveur, sans la surcharge d'une requête HTTP.
	 * - Pendant le rendu côté serveur, la réponse est capturée et <span class='vo'>[inlinée](https://sveltefr.dev/docs/javascript#inline)</span> dans le HTML rendu en utilisant les méthodes `text` et `json` de l'objet `Response`. Notez que les <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> ne seront _pas_ sérialisés, à moins d'être inclus explicitement via [`filterSerializedResponseHeaders`](https://kit.sveltefr.dev/docs/hooks#hooks-de-serveur-handle)
	 * - Pendant l'hydratation, la réponse est lue depuis le HTML, en garantissant la cohérence et évitant une requête réseau supplémentaire.
	 *
	 * Vous pouvez en apprendre plus sur les requêtes authentifiées avec cookies [ici](https://kit.sveltefr.dev/docs/load#cookies).
	 */
	fetch: typeof fetch;
	/**
	 * L'adresse IP du client, définie par l'adaptateur.
	 */
	getClientAddress(): string;
	/**
	 * Contient les données personnalisées qui ont été ajoutées à la requête via le [hook `handle`](https://kit.sveltefr.dev/docs/hooks#hooks-serveur-handle).
	 */
	locals: App.Locals;
	/**
	 * Les paramètres de la route courante – par ex. un objet `{ slug: string }` pour la route `/blog/[slug]`.
	 */
	params: Params;
	/**
	 * Des données supplémentaire rendues disponibles via l'adaptateur.
	 */
	platform: Readonly<App.Platform> | undefined;
	/**
	 * L'objet de la requête originale.
	 */
	request: Request;
	/**
	 * Des informations sur la route courante.
	 */
	route: {
		/**
		 * L'ID de la route courante – par ex. `/blog/[slug]` pour la route `src/routes/blog/[slug]`
		 */
		id: RouteId;
	};
	/**
	 * Si vous avez besoin de définir des <span class='vo'>[headers](https://sveltefr.dev/docs/web#header)</span> de réponse, vous pouvez le faire en utilisant cette méthode. Cela est utile si vous souhaitez changer la page à mettre en cache, par exemple :
	 *
	 *	```js
	 *	/// file: src/routes/blog/+page.js
	 *	export async function load({ fetch, setHeaders }) {
	 *		const url = `https://cms.example.com/articles.json`;
	 *		const response = await fetch(url);
	 *
	 *		setHeaders({
	 *			age: response.headers.get('age'),
	 *			'cache-control': response.headers.get('cache-control')
	 *		});
	 *
	 *		return response.json();
	 *	}
	 *	```
	 *
	 * Définir le même <span class='vo'>[header](https://sveltefr.dev/docs/web#header)</span> plusieurs fois (même dans des fonctions `load` différentes) est une erreur – vous pouvez définir un header donné seulement une seule fois.
	 *
	 * Vous ne pouvez pas ajouter un header `set-cookie` en même temps que vous utilisez `setHeaders` – utilisez plutôt l'<span class='vo'>[API](https://sveltefr.dev/docs/development#api)</span> [`cookies`](https://kit.sveltefr.dev/docs/types#public-types-cookies) dans une fonction `load` de serveur.
	 *
	 */
	setHeaders(headers: Record<string, string>): void;
	/**
	 * L'URL demandée.
	 */
	url: URL;
	/**
	 * Vaut `true` si la requête vient du client demandant les données de `+page/layout.server.js`. La propriété `url` ne contiendra pas dans ce cas les informations internes liées à la requête de données.
	 * Utilisez cette propriété si cette distinction est importante pour vous.
	 */
	isDataRequest: boolean;
	/**
	 * Vaut `true` pour les requêtes `+server.js` venant de SvelteKit sans avoir généré de requête HTTP au sens propre. Ceci se produit lorsque vous faites depuis le serveur des requêtes `fetch` venant de la même origine.
	 */
	isSubRequest: boolean;
}

/**
 * Une fonction `(event: RequestEvent) => Response` exportée depuis un fichier `+server.js` et correspondant à un verbe HTTP (`GET`, `PUT`, `PATCH`, etc), permettant de gérer les requêtes avec cette méthode.
 *
 * Elle reçoit un objet `Params` comme type par défaut du premier argument, ce que vous pouvez éviter en utilisant plutôt des [types générés](https://kit.sveltefr.dev/docs/types#generated-types).
 */
export type RequestHandler<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	RouteId extends string | null = string | null
> = (event: RequestEvent<Params, RouteId>) => MaybePromise<Response>;

export interface ResolveOptions {
	/**
	 * Applique des transformations personnalisées au HTML. Si `done` vaut `true`, il s'agit du dernier morceau (_chunk_) de HTML. Les morceaux
	 * ne sont pas forcément du HTML bien formé (ils peuvent inclure la balise ouvrante d'un élément mais pas la balise fermante, par exemple),
	 * mais ils seront toujours découpés en fonctions de frontières sensibles, comme `%sveltekit.head%` ou les composants de page ou de <span class="vo">[layout](https://sveltefr.dev/docs/web#layout)</span>.
	 * @param input le morceau de HTML et l'information de s'il s'agit du dernier morceau
	 */
	transformPageChunk?(input: { html: string; done: boolean }): MaybePromise<string | undefined>;
	/**
	 * Détermine quels <span class="vo">[headers](https://sveltefr.dev/docs/web#header)</span> doivent être inclus dans les réponses sérialisées lorsqu'une fonction `load` charge une ressource avec `fetch`.
	 * Par défaut, aucun ne sera inclus.
	 * @param name nom du header
	 * @param value valeur du header
	 */
	filterSerializedResponseHeaders?(name: string, value: string): boolean;
	/**
	 * Détermine quels fichiers doivent être ajoutés à la balise `<head>` pour les précharger.
	 * Par défaut, les fichiers `js` et `css` seront préchargés.
	 * @param input le type de fichier et son chemin
	 */
	preload?(input: { type: 'font' | 'css' | 'js' | 'asset'; path: string }): boolean;
}

export interface RouteDefinition<Config = any> {
	id: string;
	api: {
		methods: Array<HttpMethod | '*'>;
	};
	page: {
		methods: Array<Extract<HttpMethod, 'GET' | 'POST'>>;
	};
	pattern: RegExp;
	prerender: PrerenderOption;
	segments: RouteSegment[];
	methods: Array<HttpMethod | '*'>;
	config: Config;
}

export class Server {
	constructor(manifest: SSRManifest);
	init(options: ServerInitOptions): Promise<void>;
	respond(request: Request, options: RequestOptions): Promise<Response>;
}

export interface ServerInitOptions {
	/** A map of environment variables */
	env: Record<string, string>;
	/** A function that turns an asset filename into a `ReadableStream`. Required for the `read` export from `$app/server` to work */
	read?: (file: string) => ReadableStream;
}

export interface SSRManifest {
	appDir: string;
	appPath: string;
	assets: Set<string>;
	mimeTypes: Record<string, string>;

	/** propriétés privées */
	_: {
		client: NonNullable<BuildData['client']>;
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
		matchers(): Promise<Record<string, ParamMatcher>>;
		/** A `[file]: size` map of all assets imported by server code */
		server_assets: Record<string, number>;
	};
}

/**
 * La forme générique de `PageServerLoad` et `LayoutServerLoad`. Vous devriez importer ces derniers depuis `./$types` (voir la section [Types générés](https://kit.sveltefr.dev/docs/types#generated-types))
 * plutôt que d'utiliser `ServerEvent` directement.
 */
export type ServerLoad<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> = (event: ServerLoadEvent<Params, ParentData, RouteId>) => MaybePromise<OutputData>;

export interface ServerLoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>,
	RouteId extends string | null = string | null
> extends RequestEvent<Params, RouteId> {
	/**
	 * `await parent()` renvoie les données des fonctions `load` des fichiers `+layout.server.js` parents.
	 *
	 * Faites attention à ne pas introduire de "cascade" de chargement accidentelle lorsque vous utilisez `await parent()`. Si par exemple vous voulez uniquement fusionner les données du parent dans un objet à renvoyer, appelez cette fonction _après_ avoir téléchargé vos autres données.
	 */
	parent(): Promise<ParentData>;
	/**
	 * Cette fonction déclare que la fonction `load` a comme _dépendances_ une ou plusieurs URLs ou identifiants personnalisés, qui peuvent donc être utilisés avec [`invalidate()`](https://kit.sveltefr.dev/docs/modules#$app-navigation-invalidate) pour déclencher la réexécution de la méthode `load`.
	 *
	 * La plupart du temps vous n'avez pas besoin d'utiliser ceci, puisque `fetch` appelle `depends` pour vous – c'est uniquement nécessaire si vous utilisez un client d'<span class='vo'>[API](https://sveltefr.dev/docs/development#api)</span> personnalisé qui contourne `fetch`.
	 *
	 * Les URLs peuvent être absolues ou relatives à la page qui est en train d'être chargée, et doivent être [encodées](https://developer.mozilla.org/fr/docs/Glossary/percent-encoding).
	 *
	 * Les identifiants personnaliés doivent être préfixés avec une ou plusieurs lettres en minuscules suivies d'un `:` pour satisfaire la [spécification URI](https://www.rfc-editor.org/rfc/rfc3986.html).
	 *
	 * L'exemple suivant vous montre comment utiliser `depends` pour déclarer une dépendance à un identifiant personnalisé, qui sera invalidé  avec `invalidate` après un clic sur un bouton, déclenchant la réexécution de la fonction `load`.
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * let count = 0;
	 * export async function load({ depends }) {
	 * 	depends('increase:count');
	 *
	 * 	return { count: count++ };
	 * }
	 * ```
	 *
	 * ```html
	 * /// file: src/routes/+page.svelte
	 * <script>
	 * 	import { invalidate } from '$app/navigation';
	 *
	 * 	export let data;
	 *
	 * 	const increase = async () => {
	 * 		await invalidate('increase:count');
	 * 	}
	 * </script>
	 *
	 * <p>{data.count}<p>
	 * <button on:click={increase}>Augmenter le compteur</button>
	 * ```
	 */
	depends(...deps: string[]): void;
	/**
	 * Use this function to opt out of dependency tracking for everything that is synchronously called within the callback. Example:
	 *
	 * ```js
	 * /// file: src/routes/+page.js
	 * export async function load({ untrack, url }) {
	 * 	// Untrack url.pathname so that path changes don't trigger a rerun
	 * 	if (untrack(() => url.pathname === '/')) {
	 * 		return { message: 'Welcome!' };
	 * 	}
	 * }
	 * ```
	 */
	untrack<T>(fn: () => T): T;
}

/**
 * Type d'une action de formulaire qui fait partie de l'objet `export const actions = {..}` dans `+page.server.js`.
 * Voir la section [actions de formulaire](https://kit.sveltefr.dev/docs/form-actions) pour plus d'informations.
 */
export type Action<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> = (event: RequestEvent<Params, RouteId>) => MaybePromise<OutputData>;

/**
 * Type de l'objet `export const actions = {..}` dans `+page.server.js`..
 * Voir la section [actions de formulaire](https://kit.sveltefr.dev/docs/form-actions) pour plus d'informations.
 */
export type Actions<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	OutputData extends Record<string, any> | void = Record<string, any> | void,
	RouteId extends string | null = string | null
> = Record<string, Action<Params, OutputData, RouteId>>;

/**
 * Lorsque vous exécutez une action de formulaire via `fetch`, la réponse aura une de ces formes.
 * ```svelte
 * <form method="post" use:enhance={() => {
 *   return ({ result }) => {
 * 		// result is of type ActionResult
 *   };
 * }}
 * ```
 */
export type ActionResult<
	Success extends Record<string, unknown> | undefined = Record<string, any>,
	Failure extends Record<string, unknown> | undefined = Record<string, any>
> =
	| { type: 'success'; status: number; data?: Success }
	| { type: 'failure'; status: number; data?: Failure }
	| { type: 'redirect'; status: number; location: string }
	| { type: 'error'; status?: number; error: any };

/**
 * L'objet renvoyé par la fonction [`error`](https://kit.sveltefr.dev/docs/modules#sveltejs-kit-error)
 */
export interface HttpError {
	/** Le [code représentant le statut HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP/Status#client_error_responses), entre 400 et 599. */
	status: number;
	/** Le contenu de l'erreur. */
	body: App.Error;
}

/**
 * L'objet renvoyé par la fonction [`redirect`](https://kit.sveltefr.dev/docs/modules#sveltejs-kit-redirect)
 */
export interface Redirect {
	/** Le [code représentant le statut HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP/Status#client_error_responses), entre 400 et 599. */
	status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
	/** L'emplacement vers lequel rediriger. */
	location: string;
}

export type SubmitFunction<
	Success extends Record<string, unknown> | undefined = Record<string, any>,
	Failure extends Record<string, unknown> | undefined = Record<string, any>
> = (input: {
	action: URL;
	formData: FormData;
	formElement: HTMLFormElement;
	controller: AbortController;
	submitter: HTMLElement | null;
	cancel(): void;
}) => MaybePromise<
	| void
	| ((opts: {
		formData: FormData;
		formElement: HTMLFormElement;
		action: URL;
		result: ActionResult<Success, Failure>;
		/**
		 * Appelez cette fonction pour récupérer le comportement par défaut d'une soumission de formulaire.
		 * @param options Définissez `reset: false` si vous ne souhaitez pas que les valeurs de l'élément `<form>` soient réinitialisées si la soumission du formulaire s'est bien passée.
		 */
		update(options?: { reset?: boolean; invalidateAll?: boolean }): Promise<void>;
	}) => void)
>;

/**
 * Le type de la variable `export const snapshot` exportée d'un composant de page ou de <span class="vo">[layout](https://sveltefr.dev/docs/web#layout)</span>.
 */
export interface Snapshot<T = any> {
	capture: () => T;
	restore: (snapshot: T) => void;
}

export * from './index.js';
