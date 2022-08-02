import { error } from '@sveltejs/kit/data';
import { browser } from '$app/env';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	if (browser) {
		// @ts-expect-error - given value expected to throw
		throw error(555, {});
	}

	return {};
}
