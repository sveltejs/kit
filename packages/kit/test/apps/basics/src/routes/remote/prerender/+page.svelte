<script>
	import { prerendered, prerendered_entries } from './prerender.remote.js';

	let prerendered_result = $state(null);
	let live_result = $state(null);
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
