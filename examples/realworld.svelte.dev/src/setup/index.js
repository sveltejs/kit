import * as cookie from 'cookie';

export function prepare(headers) {
	const cookies = cookie.parse(headers.cookie || '');
	const jwt = cookies.jwt && Buffer.from(cookies.jwt, 'base64').toString('utf-8');

	return {
		context: {
			user: jwt && JSON.parse(jwt)
		},
		headers: {}
	};
}

export function getSession(context) {
	if (context.user) {
		const { email, username, bio, image } = context.user;

		return {
			user: {
				email,
				username,
				bio,
				image
			}
		};
	}
}
