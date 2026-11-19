<script>
	import { get_foo, make_foo } from './data.remote.js';

	let { data } = $props();

	const foo = get_foo();

	/** @type {Array<number | undefined>} */
	let calls = $state([]);
</script>

<p id="load">{String(data.foo.call?.id)}</p>
<p id="query">{String((await foo).call?.id)}</p>
<p id="calls">{calls.join(',')}</p>

<button
	id="call"
	onclick={async () => {
		const result = await make_foo();
		calls.push(result.call?.id);
	}}>call</button
>
