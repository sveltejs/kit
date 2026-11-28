<script>
	import { get_paths } from './data.remote.js';
</script>

<p id="result">{JSON.stringify(await get_paths())}</p>
