export async function GET({ fetch, url }) {
	if (url.searchParams.get('api-with-param-option') === 'prerendered') {
		return await fetch('/prerendering/prerendered-endpoint/api-with-param/prerendered');
	}

	return await fetch('/prerendering/prerendered-endpoint/api');
}
