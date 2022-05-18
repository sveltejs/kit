import purify from 'purify-css';
import { getInstance } from 'amphtml-validator';
import * as amp from '../../../../src/amp.js';

const validator = await getInstance();

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
			const purified = markup.replace('</style>', `${css}</style>`);

			const result = validator.validateString(purified);

			if (result.status === 'PASS') {
				return purified;
			}

			return JSON.stringify(result.errors);
		}
	});

	return response;
}
