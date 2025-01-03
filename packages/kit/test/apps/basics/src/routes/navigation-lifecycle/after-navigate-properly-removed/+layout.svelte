<script>
	import { onNavigate } from '$app/navigation';
	let { children } = $props();

	onNavigate(() => {
		return () => {};
	});
</script>

{@render children()}
