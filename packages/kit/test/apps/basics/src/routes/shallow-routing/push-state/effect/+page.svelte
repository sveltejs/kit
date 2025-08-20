<script lang="ts">
	import { pushState } from '$app/navigation';

	let count = $state(0);

	$effect(() => {
		if (count) pushState('', { count });
	});
</script>

<p>count: {count}</p>
<button onclick={() => count++}>Increment</button>
