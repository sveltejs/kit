<script>
	import { afterNavigate } from '$app/navigation';

	let runs = 0;
	afterNavigate(() => {
		runs += 1;
	});
</script>

<pre>{runs}</pre>
