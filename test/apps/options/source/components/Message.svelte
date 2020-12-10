<script>
	import { browser, dev } from '$app/env';
</script>

<!-- TODO should be able to use import.meta.env.SSR here -->
<p>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</p>