<script context="module">
	export function load({ page }) {
		const { rest } = page.params;
		return { props: { rest } };
	}
</script>

<script>
	import { page } from '$app/stores';
	export let rest;
</script>

<h1>{$page.params.rest.join(',')}</h1>
<h2>{rest.join(',')}</h2>

<a href="/routing/xyz/abc/qwe/deep.json">deep</a>
<a href="/routing/xyz/abc">back</a>
