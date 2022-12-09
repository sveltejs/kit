<script>
	import { applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let form;
	let count = 0;

	/** @param {'success' | 'failure'} type */
	function update(type) {
		applyAction({ type, status: 200, data: { count: count++ } });
	}
	function redirect() {
		applyAction({ type: 'redirect', status: 303, location: '/' });
	}
	function error() {
		applyAction({ type: 'error', error: { message: 'Unexpected Form Error' } });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button class="increment-success" on:click={() => update('success')}>Increment (success)</button>
<button class="increment-invalid" on:click={() => update('failure')}>Increment (invalid)</button>
<button class="invalidateAll" on:click={invalidateAll}>Invalidate</button>
<button class="redirect" on:click={redirect}>Redirect</button>
<button class="error" on:click={error}>Error</button>
<a href="/actions/enhance">To enhance</a>
