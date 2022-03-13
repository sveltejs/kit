<script>
	import {page} from '$app/stores';
</script>
<h1>{$page.url.searchParams.get('a')}</h1>
<a href="/shadowed/no-next-fallthrough?a=test">show</a>
<a href="/shadowed/no-next-fallthrough">hide</a>
