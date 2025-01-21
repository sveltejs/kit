<script>
	import { page } from '$app/stores';

	$: title = `${$page.status}: ${$page.error.message}`;
</script>

<h1>{title}</h1>
