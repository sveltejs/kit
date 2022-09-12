import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ cookies }) => {
		cookies.set('shadow-redirect', 'happy', {
			secure: false // safari
		});
		throw redirect(302, '/shadowed/redirected');
	}
};
