<script>
	import { browser } from '$app/environment';

	if (browser) {
		const original_fetch = window.fetch;
		window.fetch = (input, init) => {
			console.log('Called a patched window.fetch for server load request');
			return original_fetch(input, init);
		};
	}
</script>

<p>
	The sole purpose of this page is to apply a `window.fetch` patch before navigating to the next
	page. Click the link below to navigate to the next page with a server load function.
</p>

<a href="./patching-server-load-ii">Go To Page with Server Load</a>
