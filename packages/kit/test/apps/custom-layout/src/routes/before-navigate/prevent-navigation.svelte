<script>
	import { beforeNavigate } from '$app/navigation';

	let triggered = false;
	beforeNavigate(({ cancel }) => {
		triggered = true;
		cancel();
	});
</script>

<h1>prevent navigation</h1>
<a href="/before-navigate/a">a</a>
<pre>{triggered}</pre>
