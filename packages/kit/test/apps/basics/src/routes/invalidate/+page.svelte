<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<pre>load: {data.load}</pre>
<button type="button" on:click={() => invalidate('app://invalidate/load')}>
	invalidate('app://invalidate/load')
</button>

<pre>serverLoad: {data.serverLoad}</pre>
<button type="button" on:click={() => invalidate('app://invalidate/serverLoad')}>
	invalidate('app://invalidate/serverLoad')
</button>
