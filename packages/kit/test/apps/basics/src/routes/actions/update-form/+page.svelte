<script>
	import { updateForm } from '$app/navigation';

	export let form;
	let count = 0;

	async function update() {
		await updateForm({ count: count++ });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button on:click={update}>Increment</button>
