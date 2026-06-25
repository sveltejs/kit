import { error, redirect } from '@sveltejs/kit';

export const ssr = false;

/** @type {import('./$types').LayoutLoad} */
export const load = ({ url }) => {
	if (url.pathname === '/redirect') {
		redirect(302, '/');
	}

	if (url.pathname === '/root-layout-error') {
		error(500, 'Root layout load failed');
	}
};
