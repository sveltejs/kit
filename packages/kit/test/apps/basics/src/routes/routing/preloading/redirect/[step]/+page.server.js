import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies, params }) {
	if (params.step === 'resolve') {
		cookies.set('preload-redirect-selected', 'true', {
			path: '/routing/preloading/redirect',
			secure: false
		});

		redirect(303, '/routing/preloading/redirect/target');
	}

	if (!cookies.get('preload-redirect-selected')) {
		redirect(303, '/routing/preloading/redirect/resolve');
	}
}
