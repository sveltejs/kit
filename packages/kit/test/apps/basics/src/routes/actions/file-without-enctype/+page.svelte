<script>
	import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
	<input name="file" type="file" />
	<button type="submit">upload</button>
</form>
