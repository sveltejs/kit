<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<h1>{data.get_message} / {form?.errors?.post_message}</h1>
<h2>status: {$page.status}</h2>
