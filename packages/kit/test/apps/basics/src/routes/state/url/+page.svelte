<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const q = $derived(page.url.searchParams.get('q') || undefined);
</script>

<button
	type="button"
	onclick={() => {
		page.url.searchParams.set('q', 'test');
		goto(page.url);
	}}>test</button
>

<p>{`${q}`}</p>
