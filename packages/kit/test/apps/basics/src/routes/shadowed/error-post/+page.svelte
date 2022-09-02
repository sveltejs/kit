<script>
	import { page, submitted } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.get_message} / {$submitted?.errors?.post_message}</h1>
<h2>status: {$page.status}</h2>
