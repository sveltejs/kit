<script>
	import { prerendered, prerendered_entries } from './prerender.remote.js';

	let { data } = $props();
</script>

<p id="prerendered-data">
	{data.r1}
	{data.r2}
	{data.r3}
</p>

<button id="fetch-prerendered" onclick={() => prerendered()}>fetch prerendered</button>
<button id="fetch-not-prerendered" onclick={() => prerendered_entries('d')}
	>fetch not-prerendered</button
>
