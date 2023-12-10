<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="eager">{data.eager}</p>

{#await data.lazy.fail}
	<p class="loadingfail">loading</p>
{:catch}
	<p class="fail">fail</p>
{/await}
