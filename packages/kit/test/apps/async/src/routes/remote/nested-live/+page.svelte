<script>
	import { bump_live, live_with_child } from '../nested/nested.remote.js';

	const live = live_with_child();
</script>

<h1>Nested query in a live query</h1>

<svelte:boundary>
	{@const first = await live}
	<p id="first-tick">{first.tick}</p>
	<p id="live-child">
		{live.current ? `${live.current.tick}:${(await live.current.child).value}` : 'pending'}
	</p>

	{#snippet failed(error)}
		<p id="live-child">error: {/** @type {Error} */ (error).message}</p>
	{/snippet}
</svelte:boundary>

<button id="bump" onclick={() => bump_live()}>bump</button>
