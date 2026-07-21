<script>
	import { redirectOutsideApp } from './redirect.remote.js';

	let status = $state('idle');

	async function run() {
		status = 'pending';

		try {
			await redirectOutsideApp();
			status = 'resolved';
		} catch {
			status = 'rejected';
		}
	}
</script>

<button id="trigger" onclick={run}>trigger</button>
<p id="status">{status}</p>
