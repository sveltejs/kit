<script>
	import { get_a, get_b } from './data.remote.js';

	const a_query = $derived(get_a());
	const b_query = $derived(get_b());

	const a = $derived(await a_query);
	const b = $derived(await b_query);
</script>

<p id="result">{a + b}</p>
