<script>
	import { prerendered_form } from '../prerender.remote.js';

	let { data } = $props();
</script>

<p id="prerendered-data">
	{data.r1}
	{data.r2}
	{data.r3}
	{data.r4}
</p>

<form data-prerendered {...prerendered_form}>
	<button>submit</button>
</form>
