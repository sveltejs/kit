<script>
	/** @type {import('./$types').ActionData} */
	export let form;

	async function submit() {
		const res = await fetch(this.action, {
			method: 'POST',
			body: new FormData(this),
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
	<button>Submit</button>
</form>
