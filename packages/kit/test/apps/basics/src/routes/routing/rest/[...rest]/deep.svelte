<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ page }) {
		const { rest } = page.params;
		return { props: { rest } };
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let rest;
</script>

<h1>{$page.params.rest}</h1>
<h2>{rest}</h2>

<a href="/routing/rest/xyz/abc/qwe/deep.json">deep</a>
<a href="/routing/rest/xyz/abc">back</a>
