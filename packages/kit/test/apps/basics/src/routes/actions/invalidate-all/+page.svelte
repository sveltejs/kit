<script>
	import { enhance } from '$app/forms';

	export let data;

	/**
	 * @param {HTMLFormElement} node
	 */
	function enhanceWrapper(node) {
		return enhance(
			node,
			() =>
				({ update }) =>
					update({ invalidateAll: data.invalidate_all })
		);
	}
</script>

<form method="POST" use:enhanceWrapper>
	<pre>{data.changes_every_load.toISOString()}</pre>
	<button type="submit">invalidate</button>
</form>
