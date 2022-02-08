import { read } from '$lib/docs';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ params }) {
	const section = read('docs', params.slug);

	return {
		body: {
			section: {
				file: section.file,
				title: section.title,
				content: section.content
			}
		}
	};
}
