import { redirect } from '@sveltejs/kit';

export const ssr = false;

export const load = ({ url }) => {
	if (url.pathname === '/redirect') {
		redirect(302, '/');
	}
};
