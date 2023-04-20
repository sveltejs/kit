<script>
	import { page } from '$app/stores';

	export let data;
</script>

<p>{$page.url.pathname}</p>
<p>{data.pathname}</p>

<slot />
