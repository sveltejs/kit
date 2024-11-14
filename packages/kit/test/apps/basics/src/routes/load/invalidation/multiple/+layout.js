import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { get_layout, redirect_state } from './state';

/** @type {import('./$types').LayoutLoad} */
export function load({ depends }) {
	depends('invalid:layout');

	if (get(redirect_state) === 'running') {
		redirect_state.set('done');
		redirect(307, '/load/invalidation/multiple/redirect');
	}

	return new Promise((resolve) =>
		setTimeout(
			() =>
				resolve({
					count_layout: get_layout(),
					redirect_mode: get(redirect_state)
				}),
			Math.random() * 500
		)
	);
}
