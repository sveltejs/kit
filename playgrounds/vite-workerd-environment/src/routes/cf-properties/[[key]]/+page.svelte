<script lang="ts">
	import type { PageData } from "./$types";

	export let data: PageData

	console.log(data)
</script>

<div>
	{#if data.key}
		{#if data.value}
			<h2>Cloudflare property: {data.key}</h2>
			<h3>Value: {data.value}</h3>
		{:else}
			<h2>Cloudflare property '{data.key}' not found</h2>
		{/if}
		<hr />
	{/if}
	<h2>Available Cloudflare properties:</h2>
	<ul>
		{#each data.keys as key}
			<li><a href="/cf-properties/{key}">{key}</a></li>
		{/each}
	</ul>
</div>

<style>
	p {
		font-weight: 700;
	}
</style>