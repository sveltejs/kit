/// @ts-nocheck
// eslint-disable-next-line svelte/no-svelte-internal
import * as $ from 'svelte/internal/client';
import { notify_version } from './client.svelte.js';

/**
 * Mimics the compiled output of a component containing:
 *
 * ```js
 * let x = $derived(await Promise.resolve());
 * notify_version('<new-deployment>');
 * ```
 *
 * @returns {{ cleanup: () => void, ready: Promise<any> }}
 */
export function run() {
	/** @type {Promise<any>} */
	let ready;
	const cleanup = $.effect_root(() => {
		$.render_effect(() => {
			ready = $.async_derived(async () => {
				const restore = await $.track_reactivity_loss(Promise.resolve());
				restore();
				notify_version('<new-deployment>');
			});
		});
	});
	return { cleanup, ready };
}
