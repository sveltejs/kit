<script>
	const { children, data } = $props();
	const { root, child } = $derived(data);
	let rendered = $state('');
	let effect_runs = $state(0);
	let runs = 0;

	$effect(() => {
		// Track the merged object as well as its values to check data identity reuse.
		data;
		rendered = `${root} / ${child}`;
		effect_runs = ++runs;
	});
</script>

<p id="rendered">{rendered}</p>
<p id="effect-runs">{effect_runs}</p>
{@render children()}
