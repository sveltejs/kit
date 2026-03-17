<script>
	import { get_count } from './live.remote.js';

	const live = get_count();
</script>

<p id="ready">{String(live.ready)}</p>
<p id="connected">{String(live.connected)}</p>
<p id="count">{live.current}</p>
<p id="first-value">{await live}</p>
<button id="reconnect" onclick={() => live.reconnect()}>reconnect</button>
