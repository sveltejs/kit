/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		body: stream()
	};
}

async function* stream() {
	yield 'foo';
	yield 'bar';
}
