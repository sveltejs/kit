<script>
	import { page } from '$app/state';
	import SvelteLogo from '$lib/SvelteLogo.svelte';
</script>

<SvelteLogo />

<h2>{page.params.slug}</h2>

<a href="/path-base/base/two">/path-base/base/two</a>
