<script>
	import { get_value, get_connection_count, trigger } from './data.remote.js';

	const live = get_value();

	let connections = $state('pending');

	async function refresh_connections() {
		connections = String(await get_connection_count());
	}
</script>

<button id="trigger-error" onclick={() => trigger('error')}>trigger error</button>
<button id="trigger-redirect" onclick={() => trigger('redirect')}>trigger redirect</button>
<button id="trigger-yield" onclick={() => trigger('yield')}>trigger yield</button>
<button id="refresh-connections" onclick={refresh_connections}>refresh connections</button>

<p id="value">{live.current}</p>
<p id="error">{live.error ? `${live.error.status} ${live.error.body.message}` : ''}</p>
<p id="connected">{String(live.connected)}</p>
<p id="done">{String(live.done)}</p>
<p id="connections">{connections}</p>
