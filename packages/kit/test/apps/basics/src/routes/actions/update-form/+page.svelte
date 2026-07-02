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
		applyAction({ type: 'error', error: { status: 400, message: 'Unexpected Form Error' } });
	}
</script>

<pre>{JSON.stringify(form)}</pre>
<button class="increment-success" onclick={() => update('success')}>Increment (success)</button>
<button class="increment-invalid" onclick={() => update('failure')}>Increment (invalid)</button>
<button class="invalidateAll" onclick={invalidateAll}>Invalidate</button>
<button class="redirect" onclick={redirect}>Redirect</button>
<button class="error" onclick={error}>Error</button>
<a href="/actions/enhance">To enhance</a>
