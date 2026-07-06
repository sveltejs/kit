<script>
	import { isHttpError } from '@sveltejs/kit';
	import { live_fail } from './data.remote';

	const { params } = $props();
	const q = $derived(live_fail(params.key));
</script>

<div id="live-error">
	{isHttpError(q.error)
		? `${q.error.status}: ${q.error.body?.message}`
		: q.error
			? JSON.stringify(q.error)
			: 'none'}
</div>
