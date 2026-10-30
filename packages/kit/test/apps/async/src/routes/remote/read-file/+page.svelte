<script>
	import { get_text } from './data.remote.js';
</script>

<p id="text">{await get_text()}</p>
