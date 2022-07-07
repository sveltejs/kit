<script>
	import { page } from '$app/stores';
</script>

<pre>{JSON.stringify(
		{
			status: $page.status,
			name: $page.error.name,
			message: $page.error.message,
			stack: $page.error.stack,
			fancy: $page.error.fancy
		},
		null,
		'  '
	)}</pre>
