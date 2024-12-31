<script>
	import { page } from '$app/state';
</script>

<pre>{JSON.stringify(
		{
			status: page.status,
			...page.error
		},
		null,
		'  '
	)}</pre>
