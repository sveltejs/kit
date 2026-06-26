<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="ssrd">{data.ssrd}</p>

{#await data.streamed}
	<p class="loadingstreamed">Loading streamed</p>
{:then result}
	<p class="streamed">{result}</p>
{/await}
