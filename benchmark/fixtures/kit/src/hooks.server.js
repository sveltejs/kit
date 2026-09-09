/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
	const cookie = event.cookies.get('benchmark') ?? 'seed';

	if (!event.cookies.get('benchmark')) {
		event.cookies.set('benchmark', cookie, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax'
		});
	}

	event.locals.benchmark = {
		cohort: 'seed',
		cookie,
		path: event.url.pathname
	};

	const response = await resolve(event);
	response.headers.set('x-benchmark-cohort', event.locals.benchmark.cohort);
	return response;
}
