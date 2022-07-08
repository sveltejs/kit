import purify from 'purify-css';
import * as amp from '@sveltejs/amp';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event, {
		transformPage: ({ html }) => {
			html = amp.transform(html);

			// remove unused CSS
			let css = '';
			const markup = html.replace(
				/<style amp-custom([^>]*?)>([^]+?)<\/style>/,
				(match, attributes, contents) => {
					css = contents;
					return `<style amp-custom${attributes}></style>`;
				}
			);

			css = purify(markup, css);
			return markup.replace('</style>', `${css}</style>`);
		}
	});

	return response;
}
