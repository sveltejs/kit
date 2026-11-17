/** @type {import('./$types').RequestHandler} */
export async function GET({ fetch, url }) {
	if (url.searchParams.get('api-with-param-option') === 'prerendered') {
		return await fetch('/prerendering/prerendered-endpoint/api-with-param/prerendered');
	}

	if (url.searchParams.get('api-with-param-option') === 'percent') {
		return await fetch('/prerendering/prerendered-endpoint/api-with-param/100%25');
	}

	return await fetch('/prerendering/prerendered-endpoint/api');
}
