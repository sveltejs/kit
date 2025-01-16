<script lang="ts">
	let { form } = $props();
</script>

<form method="POST">
	<button type="submit">submit</button>
</form>

<h1>{form?.foo?.bar()}</h1>
