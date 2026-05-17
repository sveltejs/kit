<script>
	import { get_a, get_b } from './data.remote.js';

	const values = $derived({
		a: await get_a(),
		b: await get_b()
	});
</script>

<p id="result">{values.a + values.b}</p>
