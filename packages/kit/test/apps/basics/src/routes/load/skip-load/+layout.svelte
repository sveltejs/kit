<script>
	import { page } from '$app/stores';

	export let data;
</script>

<a href="/load/skip-load">/load/skip-load</a>
<a href="/load/skip-load/inner">/load/skip-load/inner</a>
<p class="skip-layout">{data.random}</p>
<pre>{JSON.stringify($page.data)}</pre>
<slot />
