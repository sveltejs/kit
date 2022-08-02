<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').Data}*/
	export let data;
</script>

<pre id="one">{JSON.stringify(data.values)}</pre>
<pre id="two">{JSON.stringify(to_pojo($page.url.searchParams))}</pre>
