<script>
	import { isHttpError } from '@sveltejs/kit';
	import { failing } from './data.remote';

	const q = failing();
</script>

<div id="q-error">
	{isHttpError(q.error)
		? `${q.error.status}: ${q.error.body?.message}`
		: q.error
			? JSON.stringify(q.error)
			: 'none'}
</div>
