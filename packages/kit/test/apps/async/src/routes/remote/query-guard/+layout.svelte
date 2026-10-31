<script>
	import { navigating } from '$app/state';

	let { children } = $props();
</script>

<nav data-sveltekit-preload-data={false} data-navigating={navigating.to !== null}>
	<a href="/remote/query-guard">home</a>
	<a href="/remote/query-guard/query">query</a>
	<a href="/remote/query-guard/batch">batch</a>
	<a href="/remote/query-guard/error">error</a>
</nav>

{@render children()}
