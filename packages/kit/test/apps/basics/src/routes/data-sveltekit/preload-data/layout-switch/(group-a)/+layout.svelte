<script>
	let { children } = $props();
</script>

<div id="layout-a">
	<p>Layout A</p>
	{@render children()}
</div>
