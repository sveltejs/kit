<script>
	const { data } = $props();

	const component = $derived(import(/* @vite-ignore */ data.componentPath));
</script>

<div data-testid="conditional-page">
	<h1>Conditional Client Import Test</h1>

	<p data-testid="variant">Current Variant: {data.variant}</p>
	<p data-testid="component-path">Component Path: {data.componentPath}</p>

	<div class="links">
		<a href="/conditional?variant=a" data-testid="link-variant-a">Load Variant A</a>
		<a href="/conditional?variant=b" data-testid="link-variant-b">Load Variant B</a>
	</div>

	{#await component}
		<p data-testid="loading">Loading component...</p>
	{:then component}
		<component.default message="Loaded variant {data.variant.toUpperCase()}!" />
	{:catch error}
		<div class="error" data-testid="error">Error: {error}</div>
	{/await}
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
