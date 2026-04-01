<script lang="ts">
	import type { RemoteQuery } from '@sveltejs/kit';
	import { get_count } from '../../query-command.remote.js';

	let status = $state('idle');
	let result = $state('');
	let stored: RemoteQuery<number>;

	function get_message(error: unknown) {
		return error instanceof Error ? error.message : String(error);
	}
</script>

<p id="status">{status}</p>
<p id="result">{result}</p>

<button
	id="create"
	onclick={() => {
		stored = get_count();
		status = 'query created';
	}}
>
	create query
</button>

<button
	id="run"
	onclick={async () => {
		result = String(await stored.run());
		status = 'query run';
	}}
>
	run query
</button>

<button
	id="read-current"
	onclick={async () => {
		try {
			await stored;
			result = 'success! :(';
		} catch (error) {
			result = get_message(error);
		}
	}}
>
	read current
</button>
