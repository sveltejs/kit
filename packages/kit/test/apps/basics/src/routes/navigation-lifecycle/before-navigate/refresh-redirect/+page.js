import { redirect } from '@sveltejs/kit';
import { flags } from './flags.js';

export function load() {
	if (flags.redirect) redirect(307, '/navigation-lifecycle/before-navigate/a');
}
