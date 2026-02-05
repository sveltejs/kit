<script>
	import { page } from '$app/state';
	import { to_pojo } from './utils.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<pre id="one">{JSON.stringify(data.values)}</pre>
<pre id="two">{JSON.stringify(to_pojo(page.url.searchParams))}</pre>
