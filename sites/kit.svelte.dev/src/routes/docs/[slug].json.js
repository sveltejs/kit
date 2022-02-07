import { read } from '$lib/docs';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ params }) {
	const section = read('docs').find((section) => section.slug === params.slug);

	return {
		body: {
			section
		}
	};
}
