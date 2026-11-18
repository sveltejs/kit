<script>
	import { get_component_data } from './data.remote.js';

	let { data } = $props();
</script>

<p id="server-load">{data.message}</p>
<p id="universal-load">{data.universal}</p>
<p id="component">{await get_component_data()}</p>
