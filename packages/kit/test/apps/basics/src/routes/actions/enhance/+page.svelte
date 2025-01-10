<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {AbortController | undefined} */
	let previous;
	let count = 0;
</script>

<pre class="data1">prop: {data.enhance_counter}, state: {page.data.enhance_counter}</pre>

<pre class="formdata1">{JSON.stringify(form)}</pre>
<pre class="formdata2">{JSON.stringify(page.form)}</pre>

<form method="post" action="?/login" use:enhance>
	<input type="hidden" name="action" value="DOM clobbering" />
	<input type="hidden" name="reset" value="DOM clobbering" />
	<input name="username" type="text" />
	<button class="form1">Submit</button>
	<button class="form1-register" formAction="?/register">Submit</button>
	<button class="form1-submitter" formAction="?/submitter" name="submitter" value="foo">
		Submit
	</button>
	<button class="form1-error" formAction="?/error">Submit</button>
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

<form method="post" action="?/echo" use:enhance>
	<input name="message" type="text" value={form?.message ?? ''} />
	<button class="form3">Submit</button>
</form>

<form action="?/counter" method="post" use:enhance>
	<button class="form4">Submit</button>
</form>

<dialog id="dialog" open>
	<form action="?/echo" method="post" use:enhance>
		<button formmethod="dialog">Cancel</button>
	</form>
</dialog>

<form action="?/send_file" method="post" use:enhance>
	<input type="file" name="file" class="form-file-input" />

	<button class="form-file-submit" formenctype="multipart/form-data" type="submit">Submit</button>
</form>
