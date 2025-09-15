<script>
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
	let { data, form } = $props();
</script>

<h1>{data.get_message} / {form?.errors?.post_message}</h1>
<h2>status: {page.status}</h2>
