<script>
	import { get_count, get_finite_count } from './live.remote.js';

	const live = get_count();
	const finite = get_finite_count();
</script>

<p id="ready">{String(live.ready)}</p>
<p id="connected">{String(live.connected)}</p>
<p id="count">{live.current}</p>
<p id="first-value">{await live}</p>
<button id="reconnect" onclick={() => live.reconnect()}>reconnect</button>

<p id="finite-value">{finite.current}</p>
<p id="finite-connected">{String(finite.connected)}</p>
<p id="finite-finished">{String(finite.finished)}</p>
<button id="finite-reconnect" onclick={() => finite.reconnect()}>reconnect finite</button>
