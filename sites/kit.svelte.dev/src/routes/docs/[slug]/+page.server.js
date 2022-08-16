import { read } from '$lib/docs/server';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const { prev, next, section } = await read('docs', params.slug);

	return {
		prev,
		next,
		section: {
			file: section.file,
			title: section.title,
			content: section.content
		}
	};
}
