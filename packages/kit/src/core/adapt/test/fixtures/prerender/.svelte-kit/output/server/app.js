function get_redirect_response(url) {
	const [, , , , url_type, encoding_style] = url.split('/');

	const base_url = (() => {
		switch (url_type) {
			case 'absolute-url':
				return 'https://my.server.com/';
			case 'path-url':
				return './../../redirected';
			case 'relative-url':
				return '/redirected';
		}
	})();

	const search_params =
		encoding_style === 'encoding'
			? new URLSearchParams({ redirect: 'https://kit.svelte.dev/docs' }).toString()
			: 'redirect=https://kit.svelte.dev/docs';

	return {
		status: 302,
		headers: {
			location: `${base_url}?${search_params}`
		}
	};
}

export class App {
	render({ url }) {
		if (url.startsWith('http://prerender/redirects/')) return get_redirect_response(url);

		return {
			status: 200,
			headers: {
				'content-type': 'text/html'
			},
			body: ''
		};
	}
}

export function override() {}
