<script>
	import { goto } from '$app/navigation';
	import { setup } from '../../../../setup.js';

	setup();

	let { children } = $props();
</script>

<a href="/a">to a</a>
<a href="/a#b">to a with hash nachor</a>
<button onclick={() => goto('/b')}>to b</button>

{@render children()}
