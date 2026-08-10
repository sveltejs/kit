<script>
	import { enhance } from '$app/forms';
</script>

<h1 class="source">source (refreshAll: false)</h1>

<form
	method="POST"
	action="/actions/cross-page/destination?/success"
	use:enhance={() =>
		async ({ update }) => {
			await update({ refreshAll: false });
		}}
>
	<input name="username" type="text" value="paolo" />
	<button class="submit-success">Submit</button>
</form>
