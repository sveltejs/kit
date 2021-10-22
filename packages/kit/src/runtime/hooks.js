/**
 * @param {...import('types/hooks').Handle} handlers
 * @returns {import('types/hooks').Handle}
 */
export function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ request, resolve }) => resolve(request);

	return ({ request, loader, resolve }) => {
		return apply_handle(0, request);

		/**
		 * @param {number} i
		 * @param {import('types/hooks').ServerRequest} request
		 * @returns {import('types/helper').MaybePromise<import('types/hooks').ServerResponse>}
		 */
		function apply_handle(i, request) {
			const handle = handlers[i];

			return handle({
				request,
				loader,
				resolve: i < length - 1 ? (request) => apply_handle(i + 1, request) : resolve
			});
		}
	};
}
