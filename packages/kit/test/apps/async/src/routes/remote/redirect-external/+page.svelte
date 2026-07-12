<script>
	import { redirectOutsideApp } from './redirect.remote.js';

	let condition = $state(false);

	async function run() {
		condition = true;
	}
</script>

<button id="trigger" onclick={run}>trigger</button>
<p id="status">{await redirectOutsideApp(condition)}</p>
