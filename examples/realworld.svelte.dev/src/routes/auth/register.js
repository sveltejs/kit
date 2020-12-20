import * as api from '$common/api.js';
import { respond } from './_respond';

export async function post(request) {
	const user = request.body;

	// TODO individual properties
	console.log('user', user);

	const body = await api.post('users', { user });

	return respond(body);
}
