/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		headers: { 'Content-Type': 'text/csv' },
		body: generateCSV()
	};
}

async function* generateCSV() {
	yield '1,one\n';
	yield '2,two\n';
}
