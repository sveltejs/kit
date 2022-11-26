<script>
	import { goto, preloadCode, preloadData } from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, { goto, preloadCode, preloadData });
	}
</script>

<slot />

<footer>Custom layout</footer>
