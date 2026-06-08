<script>
	import { prerender_parent } from '../nested/nested.remote.js';

	const pparent = prerender_parent('p');
</script>

<h1>Nested prerender</h1>

<svelte:boundary>
	<p id="prerender-child">{await (await pparent).child}</p>

	{#snippet failed(error)}
		<p id="prerender-child">error: {/** @type {Error} */ (error).message}</p>
	{/snippet}
</svelte:boundary>
