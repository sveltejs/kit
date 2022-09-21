<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<pre>load: <span data-testid="sharedResponse">{data.load}</span> (<span>{data.loadTimestamp}</span
	>)</pre>
<button
	type="button"
	data-testid="invalidateSharedLoad"
	on:click={() => invalidate('app://invalidate/load')}
>
	invalidate('app://invalidate/load')
</button>

<pre>serverLoad: <span data-testid="serverResponse">{data.serverLoad}</span
	> ({data.serverLoadTimestamp})</pre>
<button
	type="button"
	data-testid="invalidateServerLoad"
	on:click={() => invalidate('app://invalidate/serverLoad')}
>
	invalidate('app://invalidate/serverLoad')
</button>
