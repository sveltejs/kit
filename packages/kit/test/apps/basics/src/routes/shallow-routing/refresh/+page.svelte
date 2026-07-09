<script>
	import { invalidate, invalidateAll, refreshAll, pushState } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	function activate() {
		pushState('', { active: true });
	}
</script>

<h1>refresh</h1>

<button data-id="activate" onclick={activate}>push state</button>
<button data-id="refreshAll" onclick={() => (window.promise = refreshAll())}>refreshAll</button>
<button data-id="invalidate" onclick={() => (window.promise = invalidate('refresh:now'))}
	>invalidate</button
>
<button data-id="invalidateAll" onclick={() => (window.promise = invalidateAll())}
	>invalidateAll</button
>

<p>active: {page.state.active ?? false}</p>
<span>{data.now}</span>
