<script>
	import { goto, pushState, replaceState } from '$app/navigation';
	import { setup } from '../../../../setup.js';

	setup();

	let { children } = $props();
</script>

<a href="/a">to a</a>
<a href="/a#b">to a#b</a>
<button data-goto onclick={() => goto('/b')}>goto b</button>
<button data-push onclick={() => pushState('/b', {})}>pushState b</button>
<button data-replace onclick={() => replaceState('/a#b', {})}>replaceState a#b</button>

{@render children()}
