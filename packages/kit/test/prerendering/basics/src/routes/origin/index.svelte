<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let message;
</script>

<h1>{message}</h1>
<h2>{$page.url.origin}</h2>
