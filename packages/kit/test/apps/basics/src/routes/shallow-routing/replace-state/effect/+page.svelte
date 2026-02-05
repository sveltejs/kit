<script lang="ts">
	import { pushState as replaceState } from '$app/navigation';

	let count = $state(0);

	$effect(() => {
		if (count) replaceState('', { count });
	});
</script>

<p>count: {count}</p>
<button onclick={() => count++}>Increment</button>
