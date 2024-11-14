import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: () => {
		redirect(302, '/shadowed/redirected');
	}
};
