import * as fs from 'node:fs';

export const prerender = true;

export async function GET({ params }) {
	const slug = params.slug.split('/');
	const extension = slug[0].split('.').pop();

	const file = fs.readFileSync(`./static/image.${extension}`);

	return new Response(file, {
		headers: {
			'Content-Type': 'image/' + extension
		}
	});
}
