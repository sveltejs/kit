<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const q = $derived(page.url.searchParams.get('q') || undefined);
</script>

<button
	type="button"
	onclick={() => {
		// @ts-expect-error set is not in the types; we wanna test here that we guard against mutation in goto, too
		page.url.searchParams.set('q', 'test');
		// @ts-expect-error
		goto(page.url);
	}}>test</button
>

<p>{`${q}`}</p>
