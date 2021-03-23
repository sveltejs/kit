import * as api from '$lib/api.js';
import { respond } from './_respond';

export async function post(request) {
	const body = await api.post('users/login', {
		user: {
			email: request.body.email,
			password: request.body.password
		}
	});

	return respond(body);
}
