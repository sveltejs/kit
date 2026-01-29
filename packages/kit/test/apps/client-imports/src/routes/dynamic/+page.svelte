<script>
	const { data } = $props();

	const component = $derived(import(/* @vite-ignore */ data.componentPath));
</script>

<div data-testid="dynamic-page">
	<h1>Dynamic Import Test</h1>

	<p data-testid="component-name">Component Name: {data.componentName}</p>
	<p data-testid="component-path">Component Path: {data.componentPath}</p>

	{#await component}
		<p data-testid="loading">Loading component...</p>
	{:then component}
		<component.default message="Dynamically loaded from dynamic server import!" />
	{:catch error}
		<div class="error" data-testid="error">Error: {error}</div>
	{/await}
</div>

<style>
	.error {
		color: red;
		padding: 1rem;
		border: 2px solid red;
		border-radius: 4px;
	}
</style>
