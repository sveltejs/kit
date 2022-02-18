import { read } from '$lib/docs/server';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get({ params }) {
	const { prev, next, section } = await read('docs', params.slug);

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
