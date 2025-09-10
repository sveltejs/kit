<script>
	import { page } from '$app/state';
	import { layoutRedirect } from '../redirect.remote';

	let { children } = $props();
</script>

<!-- TODO convert to await expression once experimental async turned on -->
{#await layoutRedirect(page.url.pathname) then path}
	<p id="layout-query">on page {path} (== {page.url.pathname})</p>
{/await}

{@render children()}
