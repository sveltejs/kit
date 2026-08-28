<script>
	import { goto } from '$app/navigation';
	import { setup } from '../../../../setup.js';

	setup();

	let { children } = $props();
</script>

<a href="/">/</a>
<a href="/#/a">/#/a</a>
<a href="/#/b">/#/b</a>
<a href="/#/a#b">/#/a#b</a>
<a href="/#/b/123">/#/b/123</a>
<a href="/#/b/456">/#/b/456</a>
<a href="/#/reroute-a">/#/reroute-a</a>
<a href="/#/reroute-b">/#/reroute-b</a>
<button data-goto onclick={() => goto('/#/b')}>goto /#/b</button>
<button data-shallow onclick={() => goto('/#/b', { shallow: true })}>shallow /#/b</button>
<button data-shallow-replace onclick={() => goto('/#/a#b', { shallow: true, replace: true })}
	>shallow replace /#/a#b</button
>

{@render children()}
