<script>
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<pre>{JSON.stringify(form)}</pre>

<form method="post">
	<button type="submit">Submit</button>
</form>
