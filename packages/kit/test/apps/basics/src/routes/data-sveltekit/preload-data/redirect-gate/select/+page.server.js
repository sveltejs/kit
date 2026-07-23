import { redirect } from '@sveltejs/kit';
import { state } from '../state.js';

export function load() {
	state.selected = true;
	redirect(303, '/data-sveltekit/preload-data/redirect-gate/dashboard');
}
