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

<div data-testid="conditional-page">
	<h1>Conditional Client Import Test</h1>

	<p data-testid="variant">Current Variant: {data.variant}</p>
	<p data-testid="component-path">Component Path: {data.componentPath}</p>

	<div class="links">
		<a href="/conditional?variant=a" data-testid="link-variant-a">Load Variant A</a>
		<a href="/conditional?variant=b" data-testid="link-variant-b">Load Variant B</a>
	</div>

	{#if error}
		<div class="error" data-testid="error">Error: {error}</div>
	{:else if Component}
		<svelte:component this={Component} message="Loaded variant {data.variant.toUpperCase()}!" />
	{:else}
		<p data-testid="loading">Loading component...</p>
	{/if}
</div>

<style>
	.links {
		margin: 1rem 0;
		display: flex;
		gap: 1rem;
	}

	.links a {
		padding: 0.5rem 1rem;
		background: #333;
		color: white;
		text-decoration: none;
		border-radius: 4px;
	}

	.links a:hover {
		background: #555;
	}

	.error {
		color: red;
		padding: 1rem;
		border: 2px solid red;
		border-radius: 4px;
	}
</style>
