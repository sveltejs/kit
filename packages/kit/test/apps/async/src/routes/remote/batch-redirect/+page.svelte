<script>
	import { batch_redirect } from './data.remote.js';

	let status = $state('idle');

	async function run() {
		status = 'pending';

		try {
			await Promise.all([batch_redirect('a'), batch_redirect('b')]);
			status = 'resolved';
		} catch {
			status = 'rejected';
		}
	}
</script>

<button id="trigger" onclick={run}>trigger</button>
<p id="status">{status}</p>
