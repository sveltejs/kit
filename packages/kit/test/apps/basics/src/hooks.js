import cookie from 'cookie';

/** @type {import('@sveltejs/kit').GetContext} */
export function getContext(request) {
	const cookies = cookie.parse(request.headers.cookie || '');

	return {
		answer: 42,
		name: cookies.name
	};
}

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession({ context }) {
	return context;
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ request, render }) {
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
