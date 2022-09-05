<script>
	import { updateForm } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let form;
	let count = 0;

	function update(type) {
		updateForm({ type, data: { count: count++ } });
	}
	function redirect() {
		updateForm({ type: 'redirect', status: 303, location: '/' });
	}
	function error() {
		updateForm({ type: 'error', error: { message: 'Unexpected Form Error' } });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button class="increment-success" on:click={() => update('success')}>Increment (success)</button>
<button class="increment-invalid" on:click={() => update('invalid')}>Increment (invalid)</button>
<button class="invalidateAll" on:click={invalidateAll}>Invalidate</button>
<button class="redirect" on:click={redirect}>Redirect</button>
<button class="error" on:click={error}>Error</button>
<a href="/actions/enhance">To enhance</a>
