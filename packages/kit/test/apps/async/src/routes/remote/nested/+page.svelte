<script>
	import { create_child, get_parent } from './nested.remote.js';

	let command_result = $state('idle');

	const parent = get_parent('a');
</script>

<h1>Nested remote functions</h1>

<svelte:boundary>
	<p id="parent">{(await parent).label}</p>
	<p id="child">{(await (await parent).child).value}</p>

	{#snippet failed(error)}
		<p id="parent">error: {/** @type {Error} */ (error).message}</p>
	{/snippet}
</svelte:boundary>

<button
	id="create-child"
	onclick={async () => {
		const result = await create_child('z');
		const child = await result.child;
		command_result = `${result.created}/${child.value}`;
	}}
>
	create child
</button>

<p id="command-result">{command_result}</p>
