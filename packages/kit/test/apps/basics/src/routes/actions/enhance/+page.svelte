<script>
	import { enhance } from '@sveltejs/kit';

	/** @type {import('./$types').FormData} */
	export let form;
</script>

<pre>{JSON.stringify(form)}</pre>

<form method="post" use:enhance={{ result: ({ response }) => form = /** @type {any} */ (response) }}>
	<input name="username" type="text" />
	<button>Submit</button>
</form>
