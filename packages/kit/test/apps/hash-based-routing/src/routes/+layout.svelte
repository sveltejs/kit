<script>
	import { goto } from '$app/navigation';

	let { children } = $props();
</script>

<a href="/a">to a</a>
<a href="/a#b">to a with hash nachor</a>
<button onclick={() => goto('/b')}>to b</button>

{@render children()}
