<script>
	import { page } from '$app/stores';
	import { goto, pushState, replaceState, invalidate } from '$app/navigation';
	import { applyAction } from '$app/forms';

	let { children } = $props();

	let count = $state(0);

	page.subscribe(() => {
		count += 1;
	});
</script>

<p>{count}</p>

<button
	onclick={() => {
		invalidate('/state/subscribe');
	}}>invalidate</button
>

<button
	onclick={() => {
		replaceState(`/store/subscribe`, { active: true });
	}}>replaceState</button
>

<button
	onclick={() => {
		pushState(`/store/subscribe`, { active: false });
	}}>pushState</button
>

<button
	onclick={() => {
		goto(`/store/subscribe`);
	}}>goto</button
>

<button
	onclick={() => {
		applyAction({ type: 'success', status: 200 });
	}}>applyAction</button
>

{@render children()}
