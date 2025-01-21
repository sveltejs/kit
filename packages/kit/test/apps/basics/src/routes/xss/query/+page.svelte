<script>
	import { page } from '$app/stores';
	import { to_pojo } from './utils.js';

	/** @type {import('./$types').PageData}*/
	export let data;
</script>

<pre id="one">{JSON.stringify(data.values)}</pre>
<pre id="two">{JSON.stringify(to_pojo($page.url.searchParams))}</pre>
