<script>
	import { beforeNavigate } from '$app/navigation';

	const implicit_download_url = '/navigation-lifecycle/before-navigate/download';

	let times_triggered = 0;
	let unload = false;
	let navigation_type;

	beforeNavigate(({ cancel, type, willUnload, to }) => {
		times_triggered++;
		unload = willUnload;
		navigation_type = type;

		// we don't cancel the `beforeunload` event for the implicit download link
		// because it's needed for the download to occur.
		if (to?.url.pathname === implicit_download_url) return;

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
<a download href="/">explicit download</a>
<a href={implicit_download_url}>implicit download</a>

<pre>{times_triggered} {unload} {navigation_type}</pre>
