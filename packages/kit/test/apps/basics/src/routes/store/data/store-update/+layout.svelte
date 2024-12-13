<script>
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	let { children } = $props();

	let previous = page.data;
	let count = $state(0);

	$effect(() => {
		if (previous !== page.data) {
			untrack(() => count++);
		}
	});
</script>

<p>page.data was updated {count} time(s)</p>
<a href="/store/data/store-updates/a">a</a>
<a href="/store/data/store-updates/b">b</a>

{@render children()}
