<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="eager">{data.eager}</p>

{#await data.success}
	<p class="loadingsuccess">Loading success</p>
{:then result}
	<p class="success">{result}</p>
{/await}

{#await data.fail}
	<p class="loadingfail">Loading fail</p>
{:catch result}
	<p class="fail">{result}</p>
{/await}
