<script>
	import {
		goto,
		invalidate,
		prefetch,
		prefetchRoutes,
		beforeNavigate,
		afterNavigate
	} from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, {
			goto,
			invalidate,
			prefetch,
			prefetchRoutes,
			beforeNavigate,
			afterNavigate
		});
	}
</script>

<slot />
