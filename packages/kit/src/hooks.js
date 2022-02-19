/**
 * @param {...import('types').Handle} handlers
 * @returns {import('types').Handle}
 */
export function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ event, resolve }) => resolve(event);

	return ({ event, resolve }) => {
		return apply_handle(0, event);

		/**
		 * @param {number} i
		 * @param {import('types').RequestEvent} event
		 * @returns {import('types').MaybePromise<Response>}
		 */
		function apply_handle(i, event) {
			const handle = handlers[i];

			return handle({
				event,
				resolve: i < length - 1 ? (event) => apply_handle(i + 1, event) : resolve
			});
		}
	};
}
