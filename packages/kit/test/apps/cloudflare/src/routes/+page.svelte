<script>
	/** @type {import('./$types').PageServerData} */
	export let data;
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>Cloudflare Adapter Demo</h1>
	<span class="value">value: {JSON.stringify(data.value)}</span>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}
</style>
