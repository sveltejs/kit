<script>
	import { beforeNavigate } from '$app/navigation';

	let triggered = false;
	let navigation_type;
	beforeNavigate(({ cancel, type }) => {
		triggered = true;
		navigation_type = type;
		cancel();
	});
</script>

<h1>prevent navigation</h1>
<a href="/before-navigate/a">a</a>
<a href="https://google.de">external</a>
<pre>{triggered} {navigation_type}</pre>
