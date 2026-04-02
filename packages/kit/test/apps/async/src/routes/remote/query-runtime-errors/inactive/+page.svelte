<script lang="ts">
	import { tick } from 'svelte';
	import TrackedQuery from './TrackedQuery.svelte';
	import type { RemoteQuery } from '@sveltejs/kit';

	let show_child = $state(true);
	let status = $state('child mounted');
	let result = $state('');
	let stored: RemoteQuery<number>;

	function get_message(error: unknown) {
		return error instanceof Error ? error.message : String(error);
	}
</script>

<p id="status">{status}</p>
<p id="result">{result}</p>

{#if show_child}
	<TrackedQuery expose={(query) => (stored = query)} />
{/if}

<button
	id="unmount"
	onclick={async () => {
		show_child = false;
		await tick();
		status = 'child unmounted';
	}}
>
	unmount child
</button>

<button
	id="read-current"
	onclick={async () => {
		try {
			await stored;
			result = 'success :(';
		} catch (error) {
			result = get_message(error);
		}
	}}
>
	read current
</button>
