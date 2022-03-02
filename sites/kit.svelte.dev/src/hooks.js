const redirects = {
	'/docs/typescript': '/docs/types',
	'/docs/amp': '/docs/seo#manual-setup-amp'
};

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	if (event.url.pathname in redirects) {
		return new Response(undefined, {
			status: 308,
			headers: {
				location: redirects[event.url.pathname]
			}
		});
	}

	return resolve(event);
}
