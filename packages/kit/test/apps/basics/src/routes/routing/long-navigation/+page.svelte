<script>
	import { onNavigate } from '$app/navigation';

	onNavigate(() => new Promise((resolve) => setTimeout(resolve, 3000)));
</script>

<a href="/routing">Go to routing</a>
