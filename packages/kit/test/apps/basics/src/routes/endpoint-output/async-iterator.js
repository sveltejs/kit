/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return { body: generateAsyncIterator() };
}

async function* generateAsyncIterator() {
	yield 'foo';
	yield 'bar';
}
