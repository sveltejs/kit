import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ setHeaders }) => {
		setHeaders({ 'set-cookie': 'shadow-redirect=happy' });
		throw redirect(302, '/shadowed/redirected');
	}
};
