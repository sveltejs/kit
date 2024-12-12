<script>
	import { page } from '$app/state';

	let previous = page.data;
	let count = $state(0);

	$effect(() => {
		if (previous !== page.data) {
			count++;
		}
	});
</script>

<p>page.data was updated {count} time(s)</p>
<a href="/store/data/store-updates/a">a</a>
<a href="/store/data/store-updates/b">b</a>
<slot />
