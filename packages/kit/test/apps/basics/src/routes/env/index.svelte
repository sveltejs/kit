<script>
	import { PUBLIC_STATIC } from '$env/static/public';
	import { env } from '$env/dynamic/public';

	/** @type {string} */
	export let PRIVATE_STATIC;

	/** @type {string} */
	export let PRIVATE_DYNAMIC;
</script>

<p id="static-private">PRIVATE_STATIC: {PRIVATE_STATIC}</p>
<p id="dynamic-private">PRIVATE_DYNAMIC: {PRIVATE_DYNAMIC}</p>

<p id="static-public">PUBLIC_STATIC: {PUBLIC_STATIC}</p>
<p id="dynamic-public">PUBLIC_DYNAMIC: {env.PUBLIC_DYNAMIC}</p>
