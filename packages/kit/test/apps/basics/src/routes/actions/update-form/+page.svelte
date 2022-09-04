<script>
	import { updateForm } from '$app/forms';

	export let form;
	let count = 0;

	async function update() {
		await updateForm({ count: count++ });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button on:click={update}>Increment</button>
