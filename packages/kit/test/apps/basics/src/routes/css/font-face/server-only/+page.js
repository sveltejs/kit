import { browser } from '$app/env';

export async function load() {
	if (!browser) await import('./server-only.css');
}
