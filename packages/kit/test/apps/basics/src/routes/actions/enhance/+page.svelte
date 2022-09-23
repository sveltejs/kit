<script>
	import { enhance } from '$app/forms';
	import FormStorePrinter from './FormStorePrinter.svelte';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {AbortController | undefined} */
	let previous;
	let count = 0;
</script>

<pre class="formdata1">{JSON.stringify(form)}</pre>
<FormStorePrinter />

<form method="post" action="?/login" use:enhance>
	<input name="username" type="text" />
	<button class="form1">Submit</button>
	<button class="form1-register" formAction="?/register">Submit</button>
</form>

<span class="count">{count}</span>
<form
	method="post"
	action="?/slow"
	use:enhance={({ controller }) => {
		previous?.abort();
		previous = controller;
		return () => count++;
	}}
>
	<button class="form2">Submit</button>
</form>
