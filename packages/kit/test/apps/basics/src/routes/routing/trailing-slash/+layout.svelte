<script>
	import { page } from '$app/stores';
</script>

<ul data-sveltekit-preload-data="hover">
	<li><a href="/routing/trailing-slash/always">/always</a></li>
	<li><a href="/routing/trailing-slash/ignore/">/ignore/</a></li>
	<li><a href="/routing/trailing-slash/never/">/never/</a></li>
	<li><a href="/routing/trailing-slash/with-redirect/always">/with-redirect/always</a></li>
	<li><a href="/routing/trailing-slash/with-redirect/ignore/">/with-redirect/ignore/</a></li>
	<li><a href="/routing/trailing-slash/with-redirect/never/">/with-redirect/never/</a></li>
</ul>

<p>{$page.url.pathname}</p>

<slot />
