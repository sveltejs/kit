<script>
	import { snapshot } from '$app/navigation';

	let value = $state('');

	snapshot({
		id: 'stale-check',
		capture: () => value,
		restore: (v) => (value = v)
	});
</script>

<input data-testid="stale-input" bind:value />
