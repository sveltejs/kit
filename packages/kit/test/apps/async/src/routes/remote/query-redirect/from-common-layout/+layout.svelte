<script>
	import { page } from '$app/state';
	import { layoutRedirect } from '../redirect.remote';

	let { children } = $props();
</script>

<!-- TODO convert to await expression once experimental async turned on -->
<p id="layout-query">
	on page {(await layoutRedirect(page.url.pathname)).path} (== {page.url.pathname})
</p>

{@render children()}
