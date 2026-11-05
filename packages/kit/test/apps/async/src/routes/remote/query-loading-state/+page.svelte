<script>
	import { isHttpError } from '@sveltejs/kit';
	import { get_slow_data, get_thing } from './data.remote.js';

	// the query is kicked off during SSR (via the `loading` property access)
	// but not awaited, so SSR renders the loading state. The client must
	// fetch the data itself after hydration.
	const slow = get_slow_data();

	let transport_error = $state();

	async function fetch_thing() {
		try {
			await get_thing(Date.now());
		} catch (error) {
			const is_http_error = isHttpError(error);

			transport_error = {
				name: error?.constructor.name,
				is_http_error,
				status: is_http_error ? error.status : null
			};
		}
	}

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

<button onclick={fetch_thing}>Fetch thing</button>
<pre id="transport-error">{JSON.stringify(transport_error)}</pre>
