<script>
	import * as env from '$app/env/public';

	let { data } = $props();
</script>

<pre data-private>{JSON.stringify(data.env)}</pre>
<pre data-public>{JSON.stringify(env)}</pre>
