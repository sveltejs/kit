<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ params }) {
		const { rest } = params;
		return { props: { rest } };
	}
</script>

<script>
	import { route } from '$app/stores';

	/** @type {string} */
	export let rest;
</script>

<h1>{$route.params.rest}</h1>
<h2>{rest}</h2>

<a href="/routing/rest/xyz/abc/qwe/deep.json" rel="external">deep</a>
<a href="/routing/rest/xyz/abc">back</a>
