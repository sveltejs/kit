<script>
	import { onBeforeNavigate } from '$app/navigation';

	let triggered = false;
	onBeforeNavigate(async () => {
		triggered = true;
		return false;
	});
</script>

<h1>prevent navigation promise</h1>
<a href="/routing/history/b">b</a>
<pre>{triggered}</pre>
