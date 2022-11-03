<script>
	import { beforeNavigate } from '$app/navigation';

	let triggered = false;
	let unload = false;
	let navigation_type;
	beforeNavigate(({ cancel, type, willUnload }) => {
		triggered = true;
		unload = willUnload;
		navigation_type = type;
		cancel();
	});
</script>

<h1>prevent navigation</h1>
<a href="/before-navigate/a">a</a>
<a href="https://google.de">external</a>
<pre>{triggered} {unload} {navigation_type}</pre>
