<script>
	import { dev } from '$app/env';

	/** @type {string} */
	export let mode_from_endpoint;
</script>

<h2>
	{mode_from_endpoint} === {import.meta.env.MODE} === {dev ? 'development' : 'custom'}
</h2>
