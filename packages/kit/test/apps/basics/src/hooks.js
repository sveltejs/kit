import cookie from 'cookie';

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return request.locals;
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ request, resolve }) {
	const cookies = cookie.parse(request.headers.cookie || '');

	request.locals.answer = 42;
	request.locals.name = cookies.name;

	const response = await resolve(request);

	return {
		...response,
		headers: {
			...response.headers,
			'Set-Cookie': 'name=SvelteKit; path=/; HttpOnly'
		}
	};
}

/** @type {import('@sveltejs/kit').ExternalFetch} */
export async function externalFetch(request) {
	let newRequest = request;
	if (request.url.endsWith('/server-fetch-request.json')) {
		newRequest = new Request(
			request.url.replace('/server-fetch-request.json', '/server-fetch-request-modified.json'),
			request
		);
	}

	return fetch(newRequest);
}
