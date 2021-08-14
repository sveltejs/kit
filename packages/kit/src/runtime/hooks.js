/**
 * @param {...import('types/hooks').Handle} handles
 * @returns {import('types/hooks').Handle}
 */
export function sequence(...handles) {
	const length = handles.length;
	if (!length) return ({ request, resolve }) => resolve(request);

	return ({ request, resolve }) => {
		return apply_handle(0, request);

		/**
		 * @param {number} i
		 * @param {import('types/hooks').ServerRequest} request
		 * @returns {import('types/helper').MaybePromise<import('types/hooks').ServerResponse>}
		 */
		function apply_handle(i, request) {
			const handle = handles[i];

			return handle({
				request,
				resolve: i < length - 1 ? (request) => apply_handle(i + 1, request) : resolve
			});
		}
	};
}
