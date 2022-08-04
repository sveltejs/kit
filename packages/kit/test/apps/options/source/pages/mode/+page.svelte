<script>
	import { dev } from '$app/env';

	/** @type {import('./$types').Data} */
	export let data;
</script>

<h2>
	{data.mode_from_endpoint} === {import.meta.env.MODE} === {dev ? 'development' : 'custom'}
</h2>
