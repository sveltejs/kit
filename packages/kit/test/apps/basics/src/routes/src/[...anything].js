/** @type {import('./__types/[...anything]').RequestHandler} */
export function get() {
	return {
		body: 'dynamically rendered file'
	};
}
