import * as api from '$common/api.js';
import { respond } from './_respond';

export async function post(request, context) {
	const user = request.body;

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
