<script>
	import { page } from '$app/state';
</script>

<a href="/routing/">/routing/</a>
<a href="/routing/?">/routing/?</a>
<a href="/routing/?foo=bar">/routing/?foo=bar</a>
<a href="http://localhost:{page.url.searchParams.get('port')}/with-slash/">external</a>
