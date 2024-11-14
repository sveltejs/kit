import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ cookies }) => {
		cookies.set('shadow-redirect', 'happy', {
			path: '/shadowed',
			secure: false // safari
		});
		redirect(302, '/shadowed/redirected');
	}
};
