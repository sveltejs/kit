<script>
	import { snapshot } from '$app/navigation';

	let { children } = $props();
	let value = $state('');

	snapshot({
		id: 'snapshot-helper-layout',
		capture: () => value,
		restore: (snapshot) => (value = snapshot),
		reset: () => (value = '')
	});
</script>

<label>
	layout
	<input data-testid="layout" bind:value />
</label>

{@render children()}
