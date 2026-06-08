<script>
	import { create_child_from, get_child, get_parent_from } from '../nested/nested.remote.js';

	let command_result = $state('idle');

	const parent = get_parent_from('a');

	// a query seeded entirely on the client via `.from(...)` — should resolve without a fetch
	const client_seeded = get_child.from('client', { id: 'client', value: 'client-seeded' });
</script>

<h1>Seeded nested query (from)</h1>

<svelte:boundary>
	<p id="parent">{(await parent).label}</p>
	<p id="child">{(await (await parent).child).value}</p>
	<p id="client-seeded">{(await client_seeded).value}</p>

	{#snippet failed(error)}
		<p id="parent">error: {/** @type {Error} */ (error).message}</p>
	{/snippet}
</svelte:boundary>

<button
	id="create-child"
	onclick={async () => {
		const result = await create_child_from('z');
		const child = await result.child;
		command_result = `${result.created}/${child.value}`;
	}}
>
	create child
</button>

<p id="command-result">{command_result}</p>
