<script>
	import { page } from '$app/state';
</script>

<p>current path: {page.url.pathname}</p>

<a id="link-a" href="/data-sveltekit/preload-data/layout-switch/page-a" data-sveltekit-preload-data>Go to Page A</a>

<a id="link-b" href="/data-sveltekit/preload-data/layout-switch/page-b" data-sveltekit-preload-data>Go to Page B</a>
