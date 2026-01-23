<script>
	export let message = 'Component B loaded!';
</script>

<div class="component-b" data-testid="component-b">
	<h2>Component B</h2>
	<p>{message}</p>
</div>

<style>
	.component-b {
		padding: 1rem;
		border: 2px solid green;
		border-radius: 4px;
		margin: 1rem 0;
	}
</style>
