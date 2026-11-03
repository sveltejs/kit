<script>
	// the render does not settle until the test resolves the gate
	const value = $derived(await window.render_gate);
</script>

<p>held {value}</p>
