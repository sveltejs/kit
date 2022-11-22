import { goto, invalidate, preload, prepare, beforeNavigate, afterNavigate } from '$app/navigation';
import { onMount } from 'svelte';

export function setup() {
	onMount(() => {
		// give tests programmatic control over the app
		Object.assign(window, {
			goto,
			invalidate,
			preload,
			prepare,
			beforeNavigate,
			afterNavigate
		});

		// communicate that the app is ready
		document.body.classList.add('started');
	});
}
