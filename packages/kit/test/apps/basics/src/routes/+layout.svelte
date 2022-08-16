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

	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<slot />

<footer>{data.foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>
