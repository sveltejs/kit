<script>
	import { page } from '$app/stores';
</script>

<h1>message: {$page.data.message}</h1>
<pre>{JSON.stringify($page.data)}</pre>
