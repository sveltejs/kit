<script>
	import { goto, preload, prepare } from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, { goto, preload, prepare });
	}
</script>

<slot />

<footer>Custom layout</footer>
