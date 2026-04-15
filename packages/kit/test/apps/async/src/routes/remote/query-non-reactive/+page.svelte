<script>
	import { untrack } from 'svelte';
	import { get_count } from '../query-command.remote.js';

	let result = $state({
		current: undefined,
		error: undefined,
		ready: undefined,
		loading: undefined
	});

	function undefined_to_string(value) {
		return value === undefined ? 'undefined' : value;
	}

	$effect(() => {
		setTimeout(() => {
			result = {
				current: undefined_to_string(get_count().current),
				error: undefined_to_string(get_count().error),
				ready: get_count().ready,
				loading: get_count().loading
			};
		});
	});
</script>

<p id="current">{result.current}</p>
<p id="error">{result.error}</p>
<p id="ready">{result.ready}</p>
<p id="loading">{result.loading}</p>
