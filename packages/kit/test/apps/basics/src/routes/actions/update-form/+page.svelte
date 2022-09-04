<script>
	import { updateForm } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let form;
	let count = 0;

	async function update() {
		await updateForm({ count: count++ });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button class="increment" on:click={update}>Increment</button>
<button class="invalidateAll" on:click={invalidateAll}>Invalidate</button>
<a href="/actions/enhance">To enhance</a>
