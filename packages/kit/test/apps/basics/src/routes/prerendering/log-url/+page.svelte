<script>
	import { page } from '$app/stores';

	let error = false;

	try {
		console.log($page);
	} catch (e) {
		error = true;
	}
</script>

<p>error: {error}</p>
