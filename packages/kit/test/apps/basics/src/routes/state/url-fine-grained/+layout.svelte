<script>
	import { page } from '$app/state';

	const runs = { url: 0, pathname: 0, search: 0 };

	if (typeof window !== 'undefined') {
		// @ts-expect-error
		window.__url_runs = runs;
	}

	/** @param {unknown} value */
	function track(value) {
		return value;
	}

	$effect(() => {
		track(page.url);
		runs.url++;
	});

	$effect(() => {
		track(page.url.pathname);
		runs.pathname++;
	});

	$effect(() => {
		track(page.url.search);
		runs.search++;
	});

	const { children } = $props();
</script>

{@render children?.()}
