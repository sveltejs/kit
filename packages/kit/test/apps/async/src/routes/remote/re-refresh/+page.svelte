<script>
	import { bump, get_value } from './data.remote.js';

	const value = get_value();
</script>

<p id="value">{await value}</p>

<button id="bump" onclick={() => bump()}>bump</button>
