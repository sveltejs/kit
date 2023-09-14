// This module contains types that are visible in the documentation,
// but which cannot be imported from `@sveltejs/kit`. Care should
// be taken to avoid breaking changes when editing this file

import { RouteDefinition } from '@sveltejs/kit';

export interface AdapterEntry {
	/**
	 * Une chaîne de caractères qui identifie de manière unique un service HTTP (par exemple une fonction <span class='vo'>[serverless](https://sveltefr.dev/docs/web#serverless)</span>) et utile pour dédoublonner.
	 * Par exemple, `/foo/a-[b]` et `/foo/[c]` sont des routes différentes, mais sont toutes deux
	 * représentées par `/foo/:param` dans un fichier Netlify `_redirects`, et partagent donc un ID.
	 */
	id: string;

	/**
	 * Une fonction qui compare la route candidate avec la route courante pour déterminer
	 * si elle devrait être groupée avec la route courante.
	 *
	 * Cas d'usage :
	 * - Pages de repli : `/foo/[c]` is une solution de repli pour `/foo/a-[b]`, et `/[...catchall]` est une solution de repli pour toutes les routes
	 * - Grouper les routes qui partagent une `config` commune : `/foo` devraient être déployée sur le réseau <span class='vo'>[edge](https://sveltefr.dev/docs/web#edge)</span>,
	 * `/bar` et `/baz` devraient être déployées sur une fonction <span class='vo'>[serverless](https://sveltefr.dev/docs/web#serverless)</span>
	 */
	filter(route: RouteDefinition): boolean;

	/**
	 * Une fonction qui est invoquée une fois que l'entrée a été créée. C'est ici que vous devriez
	 * écrire la fonction dans le système de fichiers et générer les manifestes de redirections.
	 */
	complete(entry: { generateManifest(opts: { relativePath: string }): string }): MaybePromise<void>;
}

// Based on https://github.com/josh-hemphill/csp-typed-directives/blob/latest/src/csp.types.ts
//
// MIT License
//
// Copyright (c) 2021-present, Joshua Hemphill
// Copyright (c) 2021, Tecnico Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export namespace Csp {
	type ActionSource = 'strict-dynamic' | 'report-sample';
	type BaseSource =
		| 'self'
		| 'unsafe-eval'
		| 'unsafe-hashes'
		| 'unsafe-inline'
		| 'wasm-unsafe-eval'
		| 'none';
	type CryptoSource = `${'nonce' | 'sha256' | 'sha384' | 'sha512'}-${string}`;
	type FrameSource = HostSource | SchemeSource | 'self' | 'none';
	type HostNameScheme = `${string}.${string}` | 'localhost';
	type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
	type HostProtocolSchemes = `${string}://` | '';
	type HttpDelineator = '/' | '?' | '#' | '\\';
	type PortScheme = `:${number}` | '' | ':*';
	type SchemeSource = 'http:' | 'https:' | 'data:' | 'mediastream:' | 'blob:' | 'filesystem:';
	type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
	type Sources = Source[];
	type UriPath = `${HttpDelineator}${string}`;
}

export interface CspDirectives {
	'child-src'?: Csp.Sources;
	'default-src'?: Array<Csp.Source | Csp.ActionSource>;
	'frame-src'?: Csp.Sources;
	'worker-src'?: Csp.Sources;
	'connect-src'?: Csp.Sources;
	'font-src'?: Csp.Sources;
	'img-src'?: Csp.Sources;
	'manifest-src'?: Csp.Sources;
	'media-src'?: Csp.Sources;
	'object-src'?: Csp.Sources;
	'prefetch-src'?: Csp.Sources;
	'script-src'?: Array<Csp.Source | Csp.ActionSource>;
	'script-src-elem'?: Csp.Sources;
	'script-src-attr'?: Csp.Sources;
	'style-src'?: Array<Csp.Source | Csp.ActionSource>;
	'style-src-elem'?: Csp.Sources;
	'style-src-attr'?: Csp.Sources;
	'base-uri'?: Array<Csp.Source | Csp.ActionSource>;
	sandbox?: Array<
		| 'allow-downloads-without-user-activation'
		| 'allow-forms'
		| 'allow-modals'
		| 'allow-orientation-lock'
		| 'allow-pointer-lock'
		| 'allow-popups'
		| 'allow-popups-to-escape-sandbox'
		| 'allow-presentation'
		| 'allow-same-origin'
		| 'allow-scripts'
		| 'allow-storage-access-by-user-activation'
		| 'allow-top-navigation'
		| 'allow-top-navigation-by-user-activation'
	>;
	'form-action'?: Array<Csp.Source | Csp.ActionSource>;
	'frame-ancestors'?: Array<Csp.HostSource | Csp.SchemeSource | Csp.FrameSource>;
	'navigate-to'?: Array<Csp.Source | Csp.ActionSource>;
	'report-uri'?: Csp.UriPath[];
	'report-to'?: string[];

	'require-trusted-types-for'?: Array<'script'>;
	'trusted-types'?: Array<'none' | 'allow-duplicates' | '*' | string>;
	'upgrade-insecure-requests'?: boolean;

	/** @deprecated */
	'require-sri-for'?: Array<'script' | 'style' | 'script style'>;

	/** @deprecated */
	'block-all-mixed-content'?: boolean;

	/** @deprecated */
	'plugin-types'?: Array<`${string}/${string}` | 'none'>;

	/** @deprecated */
	referrer?: Array<
		| 'no-referrer'
		| 'no-referrer-when-downgrade'
		| 'origin'
		| 'origin-when-cross-origin'
		| 'same-origin'
		| 'strict-origin'
		| 'strict-origin-when-cross-origin'
		| 'unsafe-url'
		| 'none'
	>;
}

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface Logger {
	(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
	warn(msg: string): void;
	minor(msg: string): void;
	info(msg: string): void;
}

export type MaybePromise<T> = T | Promise<T>;

export interface Prerendered {
	/**
	 * Un dictionnaire de `path` vers des objets `{ file }`, où un chemin comme `/foo` correspond à `foo.html` et un chemin comme `/bar/` correspond à `bar/index.html`.
	 */
	pages: Map<
		string,
		{
			/** L'emplacement du fichier `.html`, relatif au dossier de compilation */
			file: string;
		}
	>;
	/**
	 * Un dictionnaire de `path` vers des objets `{ type }`
	 */
	assets: Map<
		string,
		{
			/** Le type <span class='vo'>[MIME](https://sveltefr.dev/docs/web#mime)</span> du fichier statique */
			type: string;
		}
	>;
	/**
	 * Un dictionnaire de redirections rencontrées durant le prérendu.
	 */
	redirects: Map<
		string,
		{
			status: number;
			location: string;
		}
	>;
	/** Un tableau de chemins prérendus (sans les <span class='vo'>[trailing slashs](https://sveltefr.dev/docs/web#trailing-slash)</span>, peu importe la configuration de trailing slash) */
	paths: string[];
}

export interface PrerenderHttpErrorHandler {
	(details: {
		status: number;
		path: string;
		referrer: string | null;
		referenceType: 'linked' | 'fetched';
		message: string;
	}): void;
}

export interface PrerenderMissingIdHandler {
	(details: { path: string; id: string; referrers: string[]; message: string }): void;
}

export interface PrerenderEntryGeneratorMismatchHandler {
	(details: { generatedFromId: string; entry: string; matchedId: string; message: string }): void;
}

export type PrerenderHttpErrorHandlerValue = 'fail' | 'warn' | 'ignore' | PrerenderHttpErrorHandler;
export type PrerenderMissingIdHandlerValue = 'fail' | 'warn' | 'ignore' | PrerenderMissingIdHandler;
export type PrerenderEntryGeneratorMismatchHandlerValue =
	| 'fail'
	| 'warn'
	| 'ignore'
	| PrerenderEntryGeneratorMismatchHandler;

export type PrerenderOption = boolean | 'auto';

export type PrerenderMap = Map<string, PrerenderOption>;

export interface RequestOptions {
	getClientAddress(): string;
	platform?: App.Platform;
}

export interface RouteSegment {
	content: string;
	dynamic: boolean;
	rest: boolean;
}

export type TrailingSlash = 'never' | 'always' | 'ignore';
