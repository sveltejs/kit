<script>
	import { browser, dev } from '$app/environment';
</script>

<p>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</p>
