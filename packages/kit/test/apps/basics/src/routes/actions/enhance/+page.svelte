<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {AbortController | undefined} */
	let previous;
	let count = 0;
</script>

<pre class="formdata1">{JSON.stringify(form)}</pre>
<pre class="formdata2">{JSON.stringify($page.form)}</pre>

<form
	method="post"
	action="?/login"
	use:enhance={({ action, data }) => {
		console.log('Called enhance() on ', action.href, 'with data', Object.fromEntries(data));
		return ({ update }) => {
			console.log('request came through, updating');
			update();
		};
	}}
>
	<input type="hidden" name="action" value="DOM clobbering" />
	<input type="hidden" name="reset" value="DOM clobbering" />
	<input name="username" type="text" />
	<button class="form1">Submit</button>
	<button class="form1-register" formAction="?/register">Submit</button>
	<button class="form1-submitter" formAction="?/submitter" name="submitter" value="foo"
		>Submit</button
	>
	<button class="form1-error" formAction="?/error">Submit</button>
</form>

<span class="count">{count}</span>
<form
	method="post"
	action="?/slow"
	use:enhance={({ controller, action, data }) => {
		console.log('Called enhance() on ', action.href, 'with data', Object.fromEntries(data));
		previous?.abort();
		previous = controller;
		return () => {
			console.log('slow request came through, incrementing count');
			count++;
		};
	}}
>
	<button class="form2">Submit</button>
</form>
