/**
 * @param {...import('types/hooks').Handle} handles
 * @returns {import('types/hooks').Handle}
 */
export function sequence(...handles) {
	const length = handles.length;
	if (!length) return ({ request, resolve }) => resolve(request);

	return ({ request, resolve }) => {
		return apply_handle(0);

		/**
		 * @param {number} i
		 * @returns {import('types/helper').MaybePromise<import('types/hooks').ServerResponse>}
		 */
		function apply_handle(i) {
			const handle = handles[i];
			const next = i >= length - 1 ? resolve : () => apply_handle(i + 1);

			return handle({ request, resolve: next });
		}
	};
}
