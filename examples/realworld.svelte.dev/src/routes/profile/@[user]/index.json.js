import * as api from '$common/api.js';

export async function get(request, context) {
	const { profile } = await api.get(
		`profiles/${request.params.user}`,
		context.user && context.user.token
	);

	return {
		body: profile
	};
}
