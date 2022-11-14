<script>
	import { page } from '$app/stores';
</script>

<h1>{decodeURIComponent($page.url.pathname.split('/').pop())}</h1>
<slot />

<a href="/encoded/entities/:-)">:-)</a>
<a href="/encoded/entities/%23">#</a>
<a href="/encoded/entities/%2F">/</a>
<a href="/encoded/entities/%3f">?</a>
<a href="/encoded/entities/苗">苗</a>
<a href="/encoded/entities/<">&lt;</a>
