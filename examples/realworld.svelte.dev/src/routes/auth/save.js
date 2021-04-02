import * as api from '$lib/api.js';
import { respond } from './_respond';

export async function post({ body: user, context }) {
	if (!context.user) {
		return {
			status: 401
		};
	}

	const { token } = context.user;
	const body = await api.put(
		'user',
		{
			user // TODO individual properties
		},
		token
	);

	return respond(body);
}
