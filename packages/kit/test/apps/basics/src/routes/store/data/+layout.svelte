<script>
	import { page } from '$app/stores';
</script>

<div id="store-data">{JSON.stringify($page.data)}</div>
<div id="store-error">{$page.error?.message}</div>
<div id="url-hash">{$page.url.hash}</div>

<nav>
	<a href="/store/data/xxx">xxx</a> <a href="/store/data/yyy">yyy</a>
	<a href="/store/data/zzz">zzz</a> <a href="/store/data/foo">foo</a>
</nav>

<slot />
