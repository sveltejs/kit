import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function POST({ cookies }) {
	cookies.set('shadow-redirect', 'happy', {
		secure: false // safari
	});
	throw redirect(302, '/shadowed/redirected');
}
