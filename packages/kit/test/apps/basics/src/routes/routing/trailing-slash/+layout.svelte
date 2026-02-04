<script>
	import { page } from '$app/state';
</script>

<ul data-sveltekit-preload-data="hover">
	<li><a href="/routing/trailing-slash/always">/always</a></li>
	<li><a href="/routing/trailing-slash/ignore/">/ignore/</a></li>
	<li><a href="/routing/trailing-slash/never/">/never/</a></li>
</ul>

<p>{page.url.pathname}</p>

<slot />
