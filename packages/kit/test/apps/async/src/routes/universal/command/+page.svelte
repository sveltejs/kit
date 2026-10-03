<script>
	import { gate, get_count, set_count } from '../universal.js';

	const count = get_count();

	let result = $state('none');
</script>

<p id="count">{(await count).count}</p>
<p id="result">{result}</p>
<p id="pending">{set_count.pending}</p>

<button
	id="set-with-updates"
	onclick={async () => {
		result = String(await set_count(1).updates(count));
	}}
>
	set (with updates)
</button>

<button
	id="set-with-function-updates"
	onclick={async () => {
		result = String(await set_count(2).updates(get_count));
	}}
>
	set (with function updates)
</button>

<button
	id="set-with-override"
	onclick={async () => {
		gate.close();
		// deliberately "wrong" optimistic value, so we can see it being replaced by the real one
		result = String(await set_count(3).updates(count.withOverride((c) => ({ ...c, count: 99 }))));
	}}
>
	set (with override)
</button>

<button
	id="set-without-updates"
	onclick={async () => {
		result = String(await set_count(4));
	}}
>
	set (without updates)
</button>

<button id="open-gate" onclick={() => gate.open()}>open gate</button>
<button id="refresh" onclick={() => count.refresh()}>refresh</button>
