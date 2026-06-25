<script>
	import { page } from '$app/state';
	import { layoutRedirect } from '../redirect.remote';

	let { children } = $props();
</script>

<p id="layout-query">
	on page {await layoutRedirect(page.url.pathname)} (== {page.url.pathname})
</p>

{@render children()}
