<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<pre>shared_count:
	<span data-testid="shared-response">{data.shared_count}</span>
	({data.shared_timestamp})
</pre>
<button
	type="button"
	data-testid="invalidate-shared-load"
	on:click={() => invalidate('app://invalidate/shared_count')}
>
	invalidate('app://invalidate/shared_count')
</button>

<pre>server_count:
	<span data-testid="server-response">{data.server_count}</span>
	({data.server_timestamp})
</pre>
<button
	type="button"
	data-testid="invalidateServerLoad"
	on:click={() => invalidate('app://invalidate/server_count')}
>
	invalidate('app://invalidate/server_count')
</button>
