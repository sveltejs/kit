<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

{#await data.fast}
	<p class="loadingfast">Loading fast</p>
{:then result}
	<p class="fast">{result}</p>
{/await}

<slot />
