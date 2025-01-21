const redirects = {
	'/docs/amp': '/docs/seo#manual-setup-amp',
	'/docs/assets': '/docs/images',
	'/docs/typescript': '/docs/types'
};

const preload_types = ['js', 'css', 'font'];

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

	return resolve(event, {
		preload: ({ type }) => preload_types.includes(type)
	});
}
