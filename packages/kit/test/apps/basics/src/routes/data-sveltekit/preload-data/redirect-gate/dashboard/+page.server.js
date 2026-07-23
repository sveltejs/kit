import { redirect } from '@sveltejs/kit';
import { state } from '../state.js';

export function load() {
	if (!state.selected) {
		redirect(303, '/data-sveltekit/preload-data/redirect-gate/select');
	}
	return {};
}
