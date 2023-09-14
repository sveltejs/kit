/**
 * Une fonction utilitaire pour orchestrer plusieurs appels à `handle` à la manière d'un <span class='vo'>[middleware](https://sveltefr.dev/docs/web#middleware)</span>.
 * Le comportement des options de `handle` est le suivant :
 * - `transformPageChunk` s'applique dans l'ordre inverse et ses résultats sont fusionnés
 * - `preload` s'applique dans l'ordre normal, la première option "gagne" et aucune option `preload` ne sera appelée après celle-ci
 * - `filterSerializedResponseHeaders` fonctionne comme `preload`
 *
 * ```js
 * /// file: src/hooks.server.js
 * import { sequence } from '@sveltejs/kit/hooks';
 *
 * /// type: import('@sveltejs/kit').Handle
 * async function first({ event, resolve }) {
 * 	console.log('first pre-processing');
 * 	const result = await resolve(event, {
 * 		transformPageChunk: ({ html }) => {
 * 			// les transformations sont appliquées dans l'ordre inverse
 * 			console.log('first transform');
 * 			return html;
 * 		},
 * 		preload: () => {
 * 			// cette option gagne puisque c'est la première définie dans la chaîne
 * 			console.log('first preload');
 * 		}
 * 	});
 * 	console.log('first post-processing');
 * 	return result;
 * }
 *
 * /// type: import('@sveltejs/kit').Handle
 * async function second({ event, resolve }) {
 * 	console.log('second pre-processing');
 * 	const result = await resolve(event, {
 * 		transformPageChunk: ({ html }) => {
 * 			console.log('second transform');
 * 			return html;
 * 		},
 * 		preload: () => {
 * 			console.log('second préchargement');
 * 		},
 * 		filterSerializedResponseHeaders: () => {
 * 			// cette option gagne puisque c'est la première définie dans la chaîne
 *    		console.log('second filterSerializedResponseHeaders');
 * 		}
 * 	});
 * 	console.log('second post-processing');
 * 	return result;
 * }
 *
 * export const handle = sequence(first, second);
 * ```
 *
 * L'exemple ci-dessus affichera :
 *
 * ```
 * first pre-processing
 * first preload
 * second pre-processing
 * second filterSerializedResponseHeaders
 * second transform
 * first transform
 * second post-processing
 * first post-processing
 * ```
 *
 * @param {...import('@sveltejs/kit').Handle} handlers The chain of `handle` functions
 * @returns {import('@sveltejs/kit').Handle}
 */
export function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ event, resolve }) => resolve(event);

	return ({ event, resolve }) => {
		return apply_handle(0, event, {});

		/**
		 * @param {number} i
		 * @param {import('@sveltejs/kit').RequestEvent} event
		 * @param {import('@sveltejs/kit').ResolveOptions | undefined} parent_options
		 * @returns {import('types').MaybePromise<Response>}
		 */
		function apply_handle(i, event, parent_options) {
			const handle = handlers[i];

			return handle({
				event,
				resolve: (event, options) => {
					/** @type {import('@sveltejs/kit').ResolveOptions['transformPageChunk']} */
					const transformPageChunk = async ({ html, done }) => {
						if (options?.transformPageChunk) {
							html = (await options.transformPageChunk({ html, done })) ?? '';
						}

						if (parent_options?.transformPageChunk) {
							html = (await parent_options.transformPageChunk({ html, done })) ?? '';
						}

						return html;
					};

					/** @type {import('@sveltejs/kit').ResolveOptions['filterSerializedResponseHeaders']} */
					const filterSerializedResponseHeaders =
						parent_options?.filterSerializedResponseHeaders ??
						options?.filterSerializedResponseHeaders;

					/** @type {import('@sveltejs/kit').ResolveOptions['preload']} */
					const preload = parent_options?.preload ?? options?.preload;

					return i < length - 1
						? apply_handle(i + 1, event, {
								transformPageChunk,
								filterSerializedResponseHeaders,
								preload
							})
						: resolve(event, { transformPageChunk, filterSerializedResponseHeaders, preload });
				}
			});
		}
	};
}
