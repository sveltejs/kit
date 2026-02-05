<script>
	import { page } from '$app/state';

	const title = $derived(`${page.status}: ${page.error.message}`);
</script>

<h1>{title}</h1>
