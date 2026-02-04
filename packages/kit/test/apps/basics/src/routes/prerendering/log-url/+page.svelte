<script>
	import { page } from '$app/state';

	let error = false;

	try {
		console.log(page);
	} catch (e) {
		error = true;
	}
</script>

<p>error: {error}</p>
