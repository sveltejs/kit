<script>
	import { page } from '$app/state';
</script>

<h1>message: {page.data.message}</h1>
<pre>{JSON.stringify(page.data)}</pre>
