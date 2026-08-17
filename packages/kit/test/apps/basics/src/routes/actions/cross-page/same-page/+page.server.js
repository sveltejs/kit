import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	return { search: url.search, loaded_at: Math.random() };
}

/** @type {import('./$types').Actions} */
export const actions = {
	del: async ({ url }) => {
		return { where: url.pathname };
	},
	fail: () => {
		return fail(400, { failed: true });
	}
};
