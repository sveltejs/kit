<script>
	let { children } = $props();

	throw new Error('layout render error');
</script>

<div id="throwing-layout">
	{@render children?.()}
</div>
