<script>
	import { get_count } from '../query-command.remote.js';

	/** @type {{ current?: unknown, error?: unknown; ready?: boolean; loading?: boolean }} */
	let result = $state({});

	/**
	 * @template T
	 * @param {T} value
	 * @returns {T | 'undefined'}
	 */
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
