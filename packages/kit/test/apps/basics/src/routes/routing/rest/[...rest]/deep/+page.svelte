<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{$page.params.rest}</h1>
<h2>{data.rest}</h2>

<a href="/routing/rest/xyz/abc/qwe/deep.json" rel="external">deep</a>
<a href="/routing/rest/xyz/abc">back</a>
