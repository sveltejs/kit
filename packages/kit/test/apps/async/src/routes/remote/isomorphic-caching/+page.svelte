<script>
	import { get_value, get_call_count, reset } from './isomorphic.remote.js';

	let call_count = $state('-');
	let dedupe_status = $state('idle');
</script>

<button
	id="reset"
	onclick={async () => {
		await reset();
		call_count = '-';
		dedupe_status = 'idle';
	}}
>
	reset server-side counters
</button>

<p>call count: <span id="call-count">{call_count}</span></p>

<button
	id="await-dedupe"
	onclick={async () => {
		dedupe_status = 'pending';
		const [a, b, c] = await Promise.all([get_value(), get_value(), get_value()]);
		if (a === b && b === c) {
			dedupe_status = 'dedupe ok';
		} else {
			dedupe_status = 'mismatch';
		}
		call_count = String(await get_call_count());
	}}
>
	await x3 simultaneously
</button>

<p>dedupe: <span id="dedupe">{dedupe_status}</span></p>
