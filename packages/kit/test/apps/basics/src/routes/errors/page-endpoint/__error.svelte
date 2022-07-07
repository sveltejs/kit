<script>
	import { page } from '$app/stores';
</script>

<pre>{JSON.stringify(
		{
			status: $page.status,
			message: $page.error.message,
			stack: $page.error.stack
		},
		null,
		'  '
	)}</pre>
