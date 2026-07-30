<script lang="ts">
	import { replaceState } from '$app/navigation';

	let count = $state(0);

	$effect(() => {
		if (count) replaceState('', { count });
	});
</script>

<p>count: {count}</p>
<button onclick={() => count++}>Increment</button>
