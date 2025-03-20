<script>
	import { beforeNavigate } from '$app/navigation';

	let times_triggered = 0;
	let unload = false;
	let navigation_type;
	beforeNavigate(({ cancel, type, willUnload, to }) => {
		times_triggered++;
		unload = willUnload;
		navigation_type = type;
		if (!to?.route.id?.includes('redirect')) {
			cancel();
		}
	});
</script>

<h1>prevent navigation</h1>
<a href="/navigation-lifecycle/before-navigate/a">a</a>
<a href="/navigation-lifecycle/before-navigate/redirect">redirect</a>
<a href="/navigation-lifecycle/before-navigate/prevent-navigation?x=1">self</a>
<a href="https://google.com" target="_blank" rel="noreferrer">_blank</a>
<a href="https://google.de">external</a>
<!-- svelte-ignore a11y-invalid-attribute -->
<a download href="">external</a>
<pre>{times_triggered} {unload} {`${navigation_type}`}</pre>
