<script>
	import { page } from '$app/state';
	import { live_value, notify } from './data.remote.js';

	const key = page.url.searchParams.get('key') ?? 'default';
	const live = live_value(key);
</script>

<p id="live-state">{live.ready ? live.current : 'loading'}</p>
<button id="notify" onclick={() => notify(key)}>notify</button>
