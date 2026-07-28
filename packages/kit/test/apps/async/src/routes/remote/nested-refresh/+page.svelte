<script>
	import { bump, get_a, get_b } from './data.remote.js';

	const a = get_a();
	const b = get_b();
</script>

<p id="a">{await a}</p>
<p id="b">{await b}</p>

<button id="bump" onclick={() => bump(5)}>bump</button>
