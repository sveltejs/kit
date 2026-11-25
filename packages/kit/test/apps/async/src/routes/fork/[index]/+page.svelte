<script lang="ts">
	import { get_index } from '../data.remote.js';

	let { params } = $props();
	const query_output = $derived(await get_index(params.index));
</script>

<p>Index {query_output}</p>
