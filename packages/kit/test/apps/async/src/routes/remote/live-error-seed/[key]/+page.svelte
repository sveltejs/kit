<script>
	import { live_fail } from './data.remote';

	const { params } = $props();
	const q = $derived(live_fail(params.key));
</script>

<div id="live-error">{q.error ? `${q.error.status}: ${q.error.body.message}` : 'none'}</div>
