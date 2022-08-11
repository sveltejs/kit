<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('./$types').Errors} */
	export let errors;
</script>

<h1>{data.get_message} / {errors.post_message}</h1>
<h2>status: {$page.status}</h2>
