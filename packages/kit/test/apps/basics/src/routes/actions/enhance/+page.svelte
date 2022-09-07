<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<pre>{JSON.stringify(form)}</pre>

<form method="post" use:enhance>
	<input name="username" type="text" />
	<button>Submit</button>
</form>
