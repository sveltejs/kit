<script context="module">
	export function preload({ params }) {
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

<a href="/routing/xyz/abc/deep">deep</a>
<a href="/routing/xyz/abc">deep</a>
<a href="/routing/xyz/abc/def">deep</a>
<a href="/routing/xyz/abc/def/ghi">deep</a>
