<script>
	import { beforeNavigate } from '$app/navigation';

	const download_url = '/before-navigate/download';

	let times_triggered = 0;
	let unload = false;
	let navigation_type;

	beforeNavigate(({ cancel, type, willUnload, to }) => {
		times_triggered++;
		unload = willUnload;
		navigation_type = type;

		// we don't call cancel so that clicking the implicit download link works.
		if (to?.url.href === download_url) return;

		if (!to?.route.id?.includes('redirect')) {
			cancel();
		}
	});
</script>

<h1>prevent navigation</h1>
<a href="/before-navigate/a">a</a>
<a href="/before-navigate/redirect">redirect</a>
<a href="/before-navigate/prevent-navigation?x=1">self</a>
<a href="https://google.com" target="_blank" rel="noreferrer">_blank</a>
<a href="https://google.de">external</a>
<a download href="/before-navigate/prevent-navigation">explicit download</a>
<a href={download_url}>implicit download</a>
<pre>{times_triggered} {unload} {navigation_type}</pre>
