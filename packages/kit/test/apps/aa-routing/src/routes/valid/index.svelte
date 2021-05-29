<script>
	import { browser, dev } from '$app/env';
</script>

<h1>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</h1>

