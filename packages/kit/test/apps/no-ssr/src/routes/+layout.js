import { redirect } from '@sveltejs/kit';

export const ssr = false;

/** @type {import('./$types').LayoutLoad} */
export const load = ({ url }) => {
	if (url.pathname === '/redirect') {
		redirect(302, '/');
	}

	if (url.pathname === '/root-layout-error') {
		throw new Error('Root layout load failed');
	}
};
