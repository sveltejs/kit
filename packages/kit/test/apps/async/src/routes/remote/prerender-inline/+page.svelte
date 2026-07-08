<script>
	import { get_prerendered } from './data.remote.js';
</script>

<p id="prerender-value">prerendered: {await get_prerendered()}</p>
