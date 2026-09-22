import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies, params }) {
	if (params.step === 'resolve') {
		cookies.set('preload-redirect-resolved', 'true', { path: '/routing/preloading/redirect' });
		redirect(303, '/routing/preloading/redirect/target');
	}

	if (!cookies.get('preload-redirect-resolved')) {
		redirect(303, '/routing/preloading/redirect/resolve');
	}
}
