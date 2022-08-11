import { read } from '$lib/docs/server';

/** @type {import('./$types').Get} */
export async function GET({ params }) {
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
