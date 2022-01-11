/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {};
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export function del() {
	return { fallthrough: true };
}
