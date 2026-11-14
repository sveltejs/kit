<script>
	let { query } = $props();
	const count = $derived(await query);
</script>

<p id="script-count">{count}</p>
