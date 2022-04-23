/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	const err = new Error();
	err.status = 200;
	err.body = { hello: 'world' };
	throw err;
}
