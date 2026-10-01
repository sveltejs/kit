<script>
	import { get_event } from './data.remote.ts';

	const results = await get_event();
</script>

<p data-id="results">{results}</p>
