<script lang="ts">
	import { prerendered, prerendered_entries, with_read } from './prerender.remote.js';

	let prerendered_result = $state<string | null>(null);
	let live_result = $state<string | null>(null);
	let read_result = $state<string | null>(null);
</script>

<a href="/remote/prerender/whole-page">whole-page</a>
<a href="/remote/prerender/functions-only">functions-only</a>

<button id="fetch-prerendered" onclick={async () => (prerendered_result = await prerendered())}>
	{prerendered_result}
</button>
<button
	id="fetch-not-prerendered"
	onclick={async () => (live_result = await prerendered_entries('d'))}
>
	{live_result}
</button>
<button id="fetch-with-read" onclick={async () => (read_result = await with_read())}>
	{read_result}
</button>
