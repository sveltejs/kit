<script>
	import { get_results } from './batch.remote.js';
</script>

<p id="results">{(await get_results()).join(', ')}</p>
