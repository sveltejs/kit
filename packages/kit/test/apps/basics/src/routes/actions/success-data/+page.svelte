<script>
	import { deserialize } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;

	async function submit({ submitter }) {
		const res = await fetch(this.action, {
			method: 'POST',
			body:
				submitter.getAttribute('formenctype') === 'multipart/form-data'
					? new FormData(this)
					: new URLSearchParams({ username: this['username'].value }),
			headers: {
				accept: 'application/json'
			}
		});
		// @ts-expect-error don't bother with type narrowing work here
		const { data } = deserialize(await res.text());
		form = data;
	}
</script>

<pre>{JSON.stringify(form)}</pre>

<form method="post" on:submit|preventDefault={submit}>
	<input name="username" type="text" />
	<button formenctype="multipart/form-data">Submit</button>
	<button formenctype="application/x-www-form-urlencoded">Submit</button>
</form>
