<script>
	import { dev, mode as mode_from_import } from '$app/env';

	/** @type {string} */
	export let mode_from_endpoint;

	console.error({ dev, mode_from_import, mode_from_endpoint, DEV: import.meta.env.DEV });
</script>

<h2>
	{mode_from_endpoint} === {mode_from_import} === {import.meta.env.MODE} === {dev
		? 'development'
		: 'custom'}
</h2>
