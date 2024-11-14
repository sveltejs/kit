<script>
	import { PUBLIC_STATIC } from '$env/static/public';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p id="static-private">PRIVATE_STATIC: {data.PRIVATE_STATIC}</p>
<p id="static-public">PUBLIC_STATIC: {PUBLIC_STATIC}</p>
