<script>
	import { page } from '$app/state';

	let { error } = $props();
</script>

<h1>{page.status}</h1>
<p>{error.message}</p>
