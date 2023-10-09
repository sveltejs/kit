<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="eager">{data.eager}</p>

{#await data.lazy.success}
	<p class="loadingsuccess">Loading success</p>
{:then result}
	<p class="success">{result}</p>
{/await}

{#await data.lazy.fail}
	<p class="loadingfail">Loading fail</p>
{:catch error}
	<p class="fail">{error.message}</p>
{/await}
