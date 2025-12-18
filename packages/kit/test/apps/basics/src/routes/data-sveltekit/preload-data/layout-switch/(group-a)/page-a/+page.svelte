<script>
	import { page } from '$app/state';
</script>

<p id="page-a-content">Page A Content</p>
<p>current path: {page.url.pathname}</p>

<a href="/data-sveltekit/preload-data/layout-switch">Back to index</a>
<a id="link-to-b" href="/data-sveltekit/preload-data/layout-switch/page-b" data-sveltekit-preload-data>Go to Page B</a>
