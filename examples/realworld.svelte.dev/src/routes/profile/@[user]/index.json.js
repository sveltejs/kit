import * as api from '$lib/api.js';

export async function get(request, context) {
	const { profile } = await api.get(
		`profiles/${request.params.user}`,
		context.user && context.user.token
	);

	return {
		body: profile
	};
}
