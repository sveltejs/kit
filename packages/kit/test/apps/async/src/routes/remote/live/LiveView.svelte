<script>
	import { get_count, get_duplicate_payload, get_finite_count } from './live.remote.js';

	const live = get_count();
	const finite = get_finite_count();
	const duplicate_payload = get_duplicate_payload();

	let duplicate_updates = $state(0);
	let duplicate_updates_value = 0;

	$effect(() => {
		if (duplicate_payload.current) {
			duplicate_updates_value += 1;
			duplicate_updates = duplicate_updates_value;
		}
	});
</script>

<p id="ready">{String(live.ready)}</p>
<p id="connected">{String(live.connected)}</p>
<p id="count">{live.current}</p>
<p id="first-value">{await live}</p>
<button id="reconnect" onclick={() => live.reconnect()}>reconnect</button>

<p id="finite-value">{finite.current}</p>
<p id="finite-connected">{String(finite.connected)}</p>
<p id="finite-done">{String(finite.done)}</p>
<button id="finite-reconnect" onclick={() => finite.reconnect()}>reconnect finite</button>

<p id="duplicate-payload-count">{duplicate_payload.current?.count}</p>
<p id="duplicate-updates">{duplicate_updates}</p>
