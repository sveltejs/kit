<script>
	import { bump, get_a } from './data.remote.js';

	const a = get_a();
</script>

<p id="value">{await a}</p>

<button id="bump" onclick={() => bump({})}>bump</button>
