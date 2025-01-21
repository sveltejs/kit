<script>
	import { page } from '$app/stores';

	export let data;
</script>

<ul>
	<li><a href="/routing/trailing-slash-server/always">/always</a></li>
	<li><a href="/routing/trailing-slash-server/ignore">/ignore</a></li>
	<li><a href="/routing/trailing-slash-server/ignore/">/ignore/</a></li>
	<li><a href="/routing/trailing-slash-server/never/">/never/</a></li>
</ul>

<p data-test-id="pathname-store">{$page.url.pathname}</p>
<p data-test-id="pathname-data">{data.pathname}</p>

<slot />
