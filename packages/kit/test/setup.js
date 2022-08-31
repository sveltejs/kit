import {
	goto,
	invalidate,
	prefetch,
	prefetchRoutes,
	beforeNavigate,
	afterNavigate
} from '$app/navigation';
import { onMount } from 'svelte';

export function setup() {
	onMount(() => {
		Object.assign(window, {
			goto,
			invalidate,
			prefetch,
			prefetchRoutes,
			beforeNavigate,
			afterNavigate
		});

		document.body.classList.add('started');
	});
}
