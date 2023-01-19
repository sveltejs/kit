<script>
	import { invalidateAll } from '$app/navigation';

	export let data;

	function reload() {
		invalidateAll();
	}
</script>

<h3>Result</h3>
<p>Data: {JSON.stringify(data)}</p>
<button on:click={reload}>Reload Data</button>
