<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	let count = $state(0);

	$effect(() => {
		page.url;
		untrack(() => {
			count += 1;
		});
	});
</script>

<button
	type="button"
	class="before"
	onclick={() => {
		pushState('', { s: 'test' });
	}}>slug = before</button
>
<button
	type="button"
	class="after"
	onclick={() => {
		pushState('/state/url/after', { s: 'test' });
	}}>slug = after</button
>

<h1>{page.url.pathname}</h1>
<h2>page.url was updated {count} time(s)</h2>
