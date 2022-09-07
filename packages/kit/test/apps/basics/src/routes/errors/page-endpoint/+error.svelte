<script>
	import { page } from '$app/stores';
</script>

<pre>{JSON.stringify(
		{
			status: $page.status,
			...$page.error
		},
		null,
		'  '
	)}</pre>
