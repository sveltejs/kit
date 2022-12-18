import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		initial: 'initial'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	redirect_302: async () => {
		throw redirect(302, '/actions/redirect/basic?redirected');
	}
};
