<script>
	import { PUBLIC_STATIC } from '$env/static/public';
	import { env } from '$env/dynamic/public';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p id="static-private">PRIVATE_STATIC: {data.PRIVATE_STATIC}</p>
<p id="dynamic-private">PRIVATE_DYNAMIC: {data.PRIVATE_DYNAMIC}</p>

<p id="static-public">PUBLIC_STATIC: {PUBLIC_STATIC}</p>
<p id="dynamic-public">PUBLIC_DYNAMIC: {env.PUBLIC_DYNAMIC}</p>
