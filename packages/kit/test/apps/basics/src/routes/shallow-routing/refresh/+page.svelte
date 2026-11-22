<script>
	import {
		goto,
		invalidate,
		invalidateAll,
		pushState,
		refreshAll,
		replaceState
	} from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	function activate() {
		goto('', { shallow: true, state: { active: true } });
	}
</script>

<h1>refresh</h1>

<button data-id="activate" onclick={activate}>add state</button>
<button data-id="refreshAll" onclick={() => (window.promise = refreshAll())}>refreshAll</button>
<button data-id="invalidate" onclick={() => (window.promise = invalidate('refresh:now'))}
	>invalidate</button
>
<button data-id="invalidateAll" onclick={() => (window.promise = invalidateAll())}
	>invalidateAll</button
>

<button
	data-id="invalidateKeepState"
	onclick={() => (window.promise = invalidate('refresh:now', true))}
	>invalidate keeping state</button
>
<button data-id="pushState" onclick={() => pushState('?state=pushed', { active: false })}
	>push state</button
>
<button data-id="replaceState" onclick={() => replaceState('?state=replaced', {})}
	>replace state</button
>

<code>{JSON.stringify(page.state)}</code>
<output>{page.shallow?.url.href}</output>
<p>active: {page.state.active ?? false}</p>
<span>{data.now}</span>
