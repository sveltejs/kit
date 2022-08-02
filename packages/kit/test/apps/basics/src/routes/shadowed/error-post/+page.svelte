<script>
	import { page } from '$app/stores';

	export let data;
	export let errors;
</script>

<h1>{data.get_message} / {errors.post_message}</h1>
<h2>status: {$page.status}</h2>
