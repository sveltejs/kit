<script>
	import { get_results } from './data.remote.js';
</script>

<p id="results">{(await get_results()).join(', ')}</p>
