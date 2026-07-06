<script>
	import { isHttpError } from '@sveltejs/kit';
	import { bump, get_count } from './data.remote';

	const { params } = $props();
	const q = $derived(get_count(params.key));
</script>

<div id="value">{q.current ?? 'unset'}</div>
<div id="error">
	{isHttpError(q.error)
		? `${q.error.status}: ${q.error.body?.message}`
		: q.error
			? JSON.stringify(q.error)
			: 'none'}
</div>

<button onclick={() => bump(params.key).updates(q)}>bump</button>
