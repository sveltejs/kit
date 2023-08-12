import * as amp from '@sveltejs/amp';
import dropcss from 'dropcss';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let buffer = '';

	const response = await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html;

			if (done) {
				const html = amp.transform(buffer);

				// remove unused CSS
				let css = '';
				const markup = buffer.replace(
					/<style amp-custom([^>]*?)>([^]+?)<\/style>/,
					(match, attributes, contents) => {
						css = contents;
						return `<style amp-custom${attributes}></style>`;
					}
				);

				css = dropcss({ css, html: markup }).css;
				return markup.replace('</style>', `${css}</style>`);
			}
		}
	});

	return response;
}
