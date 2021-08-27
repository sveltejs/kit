/**
 * @param {...import('types/hooks').Handle} handlers
 * @returns {import('types/hooks').Handle}
 */
export function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ request, resolve }) => resolve(request);

	return ({ request, resolve }) => {
		return apply_handle(0, request);

		/**
		 * @param {number} i
		 * @param {import('types/hooks').Request} request
		 * @returns {import('types/helper').MaybePromise<import('types/hooks').Response>}
		 */
		function apply_handle(i, request) {
			const handle = handlers[i];

			return handle({
				request,
				resolve: i < length - 1 ? (request) => apply_handle(i + 1, request) : resolve
			});
		}
	};
}
