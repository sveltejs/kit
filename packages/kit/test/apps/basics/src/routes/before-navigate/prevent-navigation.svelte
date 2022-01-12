<script>
	import { beforeNavigate } from '$app/navigation';

	let triggered = false;
	beforeNavigate(() => {
		triggered = true;
		return false;
	});
</script>

<h1>prevent navigation</h1>
<a href="/before-navigate/b">b</a>
<pre>{triggered}</pre>
