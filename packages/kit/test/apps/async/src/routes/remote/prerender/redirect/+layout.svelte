<script>
	import { page } from '$app/state';
	import { layout_redirect } from './redirect.remote.js';

	let { children } = $props();
</script>

<p id="layout-prerender-query">
	on page {await layout_redirect(page.url.pathname)} (== {page.url.pathname})
</p>

{@render children()}
