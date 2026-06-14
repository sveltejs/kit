<script>
	import { get_slow_data } from './data.remote.js';

	// the query is kicked off during SSR (via the `loading` property access)
	// but not awaited, so SSR renders the loading state. The client must
	// fetch the data itself after hydration.
	const slow = get_slow_data();

	function delayed_value() {
		return new Promise((resolve) => setTimeout(() => resolve('hydrated'), 500));
	}
</script>

{#if slow.loading}
	<p id="slow-state">loading</p>
{:else}
	<p id="slow-state">{slow.current}</p>
{/if}

<!-- this keeps hydration unsettled long enough for the slow query to
     read from the hydration cache rather than it being reset first -->
<p id="other">{await delayed_value()}</p>
