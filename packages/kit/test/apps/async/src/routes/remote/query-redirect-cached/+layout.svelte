<script>
	import { protected_query } from './data.remote.js';

	let { children } = $props();

	let data = $derived(await protected_query());
</script>

<p id="query-data">{data}</p>

{@render children()}
