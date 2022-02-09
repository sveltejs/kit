import { read } from '$lib/docs';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ params }) {
	const { prev, next, section } = read('docs', params.slug);

	return {
		body: {
			prev,
			next,
			section: {
				file: section.file,
				title: section.title,
				content: section.content
			}
		}
	};
}
