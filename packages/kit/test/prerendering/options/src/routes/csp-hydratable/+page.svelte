<script>
	import { hydratable } from 'svelte';

	const value = await hydratable('test-key', () => Promise.resolve('prerendered-value'));
</script>

<h1 id="hydratable-result">{value}</h1>
