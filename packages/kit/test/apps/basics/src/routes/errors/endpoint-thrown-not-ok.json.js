/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	const err = new Error();
	err.status = 555;
	throw err;
}
