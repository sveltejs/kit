<script>
	import { navigating } from '$app/stores';
</script>

<nav><a href="/store/navigating/a">a</a> <a href="/store/navigating/b">b</a></nav>

<div id="navigating">
	{#if $navigating}
		<p>navigating from {$navigating.from.path} to {$navigating.to.path}</p>
	{:else}
		<p>not currently navigating</p>
	{/if}
</div>

<slot />
