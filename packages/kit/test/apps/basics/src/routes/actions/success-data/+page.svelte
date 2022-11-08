<script>
	/** @type {import('./$types').ActionData} */
	export let form;

	async function submit({ submitter }) {
		const res = await fetch(this.action, {
			method: 'POST',
			body: submitter.getAttribute('formenctype') === 'multipart/form-data'
				? new FormData(this)
				: new URLSearchParams({ username: this['username'].value }),
			headers: {
				accept: 'application/json'
			}
		});
		const { data } = await res.json();
		form = data;
	}
</script>

<pre>{JSON.stringify(form)}</pre>

<form method="post" on:submit|preventDefault={submit}>
	<input name="username" type="text" />
	<button formenctype="multipart/form-data">Submit</button>
	<button formenctype="application/x-www-form-urlencoded">Submit</button>
</form>
