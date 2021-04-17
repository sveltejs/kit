import cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
import type { GetContext, Handle } from '@sveltejs/kit';

export const getContext: GetContext = (request) => {
	const cookies = cookie.parse(request.headers.cookie || '');

	return {
		userid: cookies.userid
	};
};

// TODO https://github.com/sveltejs/kit/issues/1046
export const handle: Handle = async ({ request, render }) => {
	const response = await render({
		...request,
		method: request.query.get('_method') || request.method
	});

	if (request.context.userid) return response;

	return {
		...response,
		headers: {
			...response.headers,
			'set-cookie': `userid=${uuid()}; Path=/; HttpOnly`
		}
	};
};
