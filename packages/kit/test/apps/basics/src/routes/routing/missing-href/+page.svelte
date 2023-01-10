<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;

	afterNavigate(() => {
		count += 1;
	});
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<a data-testid="count">count: {count}</a>
