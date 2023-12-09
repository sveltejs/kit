import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	cookies.set('shadow-redirect', 'happy', {
		path: '/shadowed',
		secure: false // safari
	});
	throw redirect(302, '/shadowed/redirected');
}
