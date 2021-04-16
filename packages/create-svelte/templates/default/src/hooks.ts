import cookie from 'cookie';
import type { GetContext, Handle } from '@sveltejs/kit';

export const getContext: GetContext = (request) => {
	const cookies = cookie.parse(request.headers.cookie || '');

	return {
		userid: cookies.userid
	};
};

// TODO https://github.com/sveltejs/kit/issues/1046
export const handle: Handle = ({ request, render }) => {
	return render({
		...request,
		method: request.query.get('_method') || request.method
	});
};
