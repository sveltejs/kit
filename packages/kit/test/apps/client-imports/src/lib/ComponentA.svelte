<script>
	export let message = 'Component A loaded!';
</script>

<div class="component-a" data-testid="component-a">
	<h2>Component A</h2>
	<p>{message}</p>
</div>

<style>
	.component-a {
		padding: 1rem;
		border: 2px solid blue;
		border-radius: 4px;
		margin: 1rem 0;
	}
</style>
