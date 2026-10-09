<script>
	import { prerendered } from './remote-read.remote.js';

	let { data } = $props();
</script>

<h1>Sum: {data.sum}</h1>
<p>Remote: {await prerendered()}</p>
