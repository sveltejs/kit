<script>
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<h1>{page.params.rest}</h1>
<h2>{data.rest}</h2>

<a href="/routing/rest/xyz/abc/deep">deep</a>
<a href="/routing/rest/xyz/abc">abc</a>
<a href="/routing/rest/xyz/abc/def">def</a>
<a href="/routing/rest/xyz/abc/def/ghi">ghi</a>
<a href="/routing/rest">empty</a>
