<script>
	import { submitted } from '$app/stores';

	async function submit() {
		console.log(Object.fromEntries(new FormData(this)))
		const res = await fetch(this.action, {
			method: 'POST',
			body: new FormData(this),
			headers: {
				'accept': 'application/json'
			}
		});
		const { data } = await res.json();
		$submitted = data;
	}
</script>

<pre>{JSON.stringify($submitted)}</pre>

<form method="post" on:submit|preventDefault={submit}>
	<input name="username" type="text" />
	<button>Submit</button>
</form>
