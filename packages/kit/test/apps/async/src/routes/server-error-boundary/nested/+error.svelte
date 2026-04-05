<script>
	import { page } from '$app/state';

	let { error } = $props();
</script>

<p id="nested-error-message">
	<!-- page.error always !== error on hydration because the former comes from the SvelteKit SSR payload and the latter from the failed boundary hydration comment -->
	Nested error: {error.message} | {page.error?.message === error.message} | {page.status}
</p>
