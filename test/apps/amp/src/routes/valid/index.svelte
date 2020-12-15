<script>
	import { browser, dev, amp } from '$app/env';
</script>

<p>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</p>

{#if amp}
	<p>amp is true</p>
{/if}