import cookie from 'cookie';

/** @type {import('../../../../types').GetContext} */
export function getContext(request) {
	const cookies = cookie.parse(request.headers.cookie || '');

	return {
		answer: 42,
		name: cookies.name
	};
}

/** @type {import('../../../../types').GetSession} */
export function getSession({ context }) {
	return context;
}

/** @type {import('../../../../types').Handle} */
export async function handle(request, render) {
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
