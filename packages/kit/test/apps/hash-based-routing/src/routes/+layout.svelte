<script>
	import { goto, pushState, replaceState } from '$app/navigation';
	import { setup } from '../../../../setup.js';

	setup();

	let { children } = $props();
</script>

<a href="/">/</a>
<a href="/#/a">/#/a</a>
<a href="/#/a#b">/#/a#b</a>
<a href="/#/b/123">/#/b/123</a>
<a href="/#/b/456">/#/b/456</a>
<a href="/#/reroute-a">/#/reroute-a</a>
<a href="/#/reroute-b">/#/reroute-b</a>
<button data-goto onclick={() => goto('/#/b')}>goto /#/b</button>
<button data-push onclick={() => pushState('/#/b', {})}>pushState /#/b</button>
<button data-replace onclick={() => replaceState('/#/a#b', {})}>replaceState /#/a#b</button>

{@render children()}
