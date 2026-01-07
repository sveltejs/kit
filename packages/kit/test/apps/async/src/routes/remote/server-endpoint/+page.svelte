<script>
	let result = $state('');
</script>

<p>{result}</p>

<button
	onclick={() =>
		fetch('/remote/server-endpoint/api')
			.then((r) => r.json())
			.then((r) => (result = r.result))}
>
	get
</button>

<button
	onclick={() =>
		fetch('/remote/server-endpoint/api', { method: 'POST' })
			.then((r) => r.json())
			.then((r) => (result = r.result))}
>
	post
</button>
