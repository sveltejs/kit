<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="eager">{data.eager}</p>

{#await data.streamed}
	<p class="loading">Loading</p>
{:catch error}
	<p class="fail">{error.message}</p>
{/await}
