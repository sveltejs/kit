<script>
	import { page } from '$app/state';
	import { layoutRedirect } from '../redirect.remote';

	let { children } = $props();

	const path = $derived(page.url.pathname + page.url.search);
</script>

<p id="layout-query">on page {await layoutRedirect(path)} (== {path})</p>

{@render children()}
