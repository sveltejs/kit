import cookie from 'cookie';

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return request.locals;
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ request, render }) {
	const cookies = cookie.parse(request.headers.cookie || '');

	request.locals.answer = 42;
	request.locals.name = cookies.name;

	const response = await render(request);

	if (response) {
		return {
			...response,
			headers: {
				...response.headers,
				'Set-Cookie': 'name=SvelteKit; path=/; HttpOnly'
			}
		};
	}
}
