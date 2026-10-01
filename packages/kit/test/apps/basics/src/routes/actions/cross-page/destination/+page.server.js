import { error, fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	if (url.searchParams.has('throw-in-load')) {
		throw new Error('server load should not run for an action error');
	}

	return {
		loaded_at: Date.now(),
		search: url.search
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	success: async ({ request }) => {
		const fields = await request.formData();
		return { source: 'destination', username: fields.get('username') };
	},
	failure: async ({ request }) => {
		const fields = await request.formData();
		return fail(400, { problem: 'invalid', username: fields.get('username') });
	},
	redirect: () => {
		redirect(303, '/actions/cross-page/redirected');
	},
	error: () => {
		error(500, 'cross-page action error');
	}
};
