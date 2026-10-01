<script>
	import { goto } from '$app/navigation';

	/** @param {MessageEvent} event */
	function onmessage(event) {
		if (event.data === 'navigate') {
			void goto('/accessibility/iframe-focus/child/next');
		}
	}
</script>

<svelte:window {onmessage} />

<h1>Embedded page</h1>
<a href="/accessibility/iframe-focus/child/next">Next</a>
