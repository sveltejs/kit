<script>
	import { browser, dev } from '$app/env';
</script>

<p>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</p>