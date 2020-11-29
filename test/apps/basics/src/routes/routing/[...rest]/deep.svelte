<script context="module">
	export function preload({ query, params }) {
		const { rest } = params;
		return { rest };
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
