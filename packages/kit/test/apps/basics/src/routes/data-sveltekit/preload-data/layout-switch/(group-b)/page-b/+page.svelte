<script>
	import { page } from '$app/state';
</script>

<p id="page-b-content">Page B Content</p>
<p>current path: {page.url.pathname}</p>

<a href="/data-sveltekit/preload-data/layout-switch">Back to index</a>
<a
	id="link-to-a"
	href="/data-sveltekit/preload-data/layout-switch/page-a"
	data-sveltekit-preload-data>Go to Page A</a
>
