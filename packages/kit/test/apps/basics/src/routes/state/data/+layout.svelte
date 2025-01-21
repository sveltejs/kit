<script>
	import { page } from '$app/state';
</script>

<div id="state-data">{JSON.stringify(page.data)}</div>
<div id="state-error">{page.error?.message}</div>
<div id="url-hash">{page.url.hash}</div>

<nav>
	<a href="/state/data/xxx">xxx</a> <a href="/state/data/yyy">yyy</a>
	<a href="/state/data/zzz">zzz</a> <a href="/state/data/foo">foo</a>
</nav>

<slot />
