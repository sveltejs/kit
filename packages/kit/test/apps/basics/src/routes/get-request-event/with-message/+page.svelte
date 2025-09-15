<script>
	let { data, form } = $props();
</script>

<h1>{form?.message ?? data.message}</h1>

<form method="POST">
	<input name="message" />
	<button>submit</button>
</form>
