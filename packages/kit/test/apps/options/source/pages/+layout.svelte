<script>
	import { onMount } from 'svelte';
	import { setup } from '../../../../setup.js';

	setup();

	// TODO: remove this when Svelte 5 addresses this issue https://github.com/sveltejs/svelte/issues/14438
	onMount(() => {
		// @ts-expect-error trustedTypes is a limited availability global
		// see https://developer.mozilla.org/en-US/docs/Web/API/Window/trustedTypes
		if (window.trustedTypes && trustedTypes.createPolicy) {
			// @ts-expect-error
			trustedTypes.createPolicy('default', {
				createHTML: (/** @type {string} */ str) => str
			});
		}
	});
</script>

<slot />
