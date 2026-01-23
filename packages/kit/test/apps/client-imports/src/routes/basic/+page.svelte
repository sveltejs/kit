<script>
	export let data;

	let Component;
	let error = null;

	$: if (data.componentPath) {
		loadComponent(data.componentPath);
	}

	async function loadComponent(path) {
		try {
			const module = await import(/* @vite-ignore */ path);
			Component = module.default;
		} catch (e) {
			error = e.message;
		}
	}
</script>

<div data-testid="basic-page">
	<h1>Basic Client Import Test</h1>

	<p data-testid="component-path">Component Path: {data.componentPath}</p>

	{#if error}
		<div class="error" data-testid="error">Error: {error}</div>
	{:else if Component}
		<svelte:component this={Component} message="Dynamically loaded from server!" />
	{:else}
		<p data-testid="loading">Loading component...</p>
	{/if}
</div>

<style>
	.error {
		color: red;
		padding: 1rem;
		border: 2px solid red;
		border-radius: 4px;
	}
</style>
