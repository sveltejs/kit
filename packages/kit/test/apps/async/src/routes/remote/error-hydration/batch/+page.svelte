<script>
	import { failing_batch } from '../data.remote';

	const q = failing_batch('x');
</script>

<!--
	batch execution is deferred to a macrotask, so the query has to be awaited
	for it to settle during SSR and have its error record serialized. The failed
	boundary doesn't re-run on hydration, so the seeded error is observed via
	the reactive getter below.
-->
<svelte:boundary>
	<div id="batch-value">{await q}</div>
	{#snippet failed()}
		<div id="batch-boundary-error">failed</div>
	{/snippet}
</svelte:boundary>

<div id="batch-error">{q.error ? `${q.error.status}: ${q.error.body?.message}` : 'none'}</div>
