<script>
	export let data
</script>

<div>
	{#if data.key}
		{#if data.value}
			<h2>Cloudflare property: {data.key}</h2>
			<h2>Value: {data.value}</h2>
		{:else}
			<h2>Cloudflare property '{data.key}' not found</h2>
		{/if}
	{/if}
	<h3>Available Cloudflare properties:</h3>
	<ul>
		{#each data.keys as key}
			<li><a href="/cf-properties/{key}">{key}</a></li>
		{/each}
	</ul>
</div>