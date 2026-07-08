<script>
	import { batch_redirect } from './data.remote.js';

	let status = $state('idle');

	async function run() {
		status = 'pending';

		try {
			await batch_redirect('a');
			status = 'resolved';
		} catch {
			status = 'rejected';
		}
	}
</script>

<button id="trigger" onclick={run}>trigger</button>
<p id="status">{status}</p>
