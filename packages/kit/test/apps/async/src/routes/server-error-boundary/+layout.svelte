<script>
	let { children } = $props();
</script>

<div id="nested-layout">
	<h2>Nested Layout</h2>
	{@render children?.()}
</div>
