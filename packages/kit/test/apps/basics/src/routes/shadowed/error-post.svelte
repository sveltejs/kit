<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let get_message;

	/** @type {string} */
	export let post_message;
</script>

<h1>{get_message} / {post_message}</h1>
<h2>status: {$page.status}</h2>
