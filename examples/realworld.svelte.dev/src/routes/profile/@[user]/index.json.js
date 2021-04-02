import * as api from '$lib/api.js';

export async function get({ params, context }) {
	const { profile } = await api.get(`profiles/${params.user}`, context.user && context.user.token);

	return {
		body: profile
	};
}
