/// @ts-nocheck
// eslint-disable-next-line svelte/no-svelte-internal
import * as $ from 'svelte/internal/client';
import { notify_version } from '../client.svelte.js';

/**
 * Mimics the compiled output of an async derived whose body continues after an
 * await, with `notify_version` standing in for a kit fetch continuation that
 * resolves in that window. `mode` picks the compiled shape:
 * `$derived(await promise)` uses `track_reactivity_loss` (can warn), while
 * `$derived((await promise)())` uses `save`, whose restored reaction context
 * makes a tracked state write throw `state_unsafe_mutation`.
 *
 * This file must not be inlined into the `.svelte.spec.js` — vite-plugin-svelte
 * compiles that file and rejects `svelte/internal` imports.
 *
 * @param {'track_reactivity_loss' | 'save'} mode
 * @returns {{ cleanup: () => void, ready: Promise<any> }}
 */
export function run(mode) {
	/** @type {Promise<any>} */
	let ready;
	const cleanup = $.effect_root(() => {
		$.render_effect(() => {
			ready = $.async_derived(async () => {
				const restore = await $[mode](Promise.resolve());
				restore();
				notify_version('<new-deployment>');
			});
		});
	});
	return { cleanup, ready };
}
