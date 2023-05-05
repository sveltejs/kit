/**
 * @param {...import('types').Handle} handlers
 * @returns {import('types').Handle}
 */
export function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ event, resolve }) => resolve(event);

	return ({ event, resolve }) => {
		return apply_handle(0, event, {});

		/**
		 * @param {number} i
		 * @param {import('types').RequestEvent} event
		 * @param {import('types').ResolveOptions | undefined} parent_options
		 * @returns {import('types').MaybePromise<Response>}
		 */
		function apply_handle(i, event, parent_options) {
			const handle = handlers[i];

			return handle({
				event,
				resolve: (event, options) => {
					/** @type {import('types').ResolveOptions['transformPageChunk']} */
					const transformPageChunk = async ({ html, done }) => {
						if (options?.transformPageChunk) {
							html = (await options.transformPageChunk({ html, done })) ?? '';
						}

						if (parent_options?.transformPageChunk) {
							html = (await parent_options.transformPageChunk({ html, done })) ?? '';
						}

						return html;
					};

					/** @type {import('types').ResolveOptions['filterSerializedResponseHeaders']} */
					const filterSerializedResponseHeaders =
						parent_options?.filterSerializedResponseHeaders ??
						options?.filterSerializedResponseHeaders;

					/** @type {import('types').ResolveOptions['preload']} */
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
