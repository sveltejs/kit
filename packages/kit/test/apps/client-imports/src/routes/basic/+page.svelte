<script>
	const { data } = $props();

	const component = $derived(import(/* @vite-ignore */ data.componentPath));
</script>

<div data-testid="basic-page">
	<h1>Basic Client Import Test</h1>

	<p data-testid="component-path">Component Path: {data.componentPath}</p>

	{#await component}
		<p data-testid="loading">Loading component...</p>
	{:then component}
		<component.default message="Dynamically loaded from server!" />
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
