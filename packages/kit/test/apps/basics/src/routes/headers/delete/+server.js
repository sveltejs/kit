import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request, setHeaders }) {
	const foo = request.headers.get('x-foo');

	const bar = request.headers.get('x-bar');

	const xCustomA = request.headers.get('x-custom-a');

	const xCustomB = request.headers.get('x-custom-b');

	setHeaders({ 'x-baz': 'foo' });

	return json({
		foo,
		bar,
		'custom-a': xCustomA,
		'custom-b': xCustomB
	});
}
