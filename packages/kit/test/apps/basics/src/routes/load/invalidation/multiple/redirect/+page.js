import { redirect } from '@sveltejs/kit';
import { redirect_state } from '../state';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const { redirect_mode } = await parent();
	if (redirect_mode === 'start') {
		redirect_state.set('running');
		redirect(307, '/load/invalidation/multiple');
	}
	if (redirect_mode === 'running') {
		throw new Error('Shouldnt get redirected here with state "running"');
	}
}
