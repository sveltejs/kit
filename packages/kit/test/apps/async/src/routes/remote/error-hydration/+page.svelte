<script>
	import { failing } from './data.remote';

	const q = failing();
</script>

<div id="q-error">
	{q.error ? `${q.error.status}: ${q.error.message}` : 'none'}
</div>
