<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { Foo } from '$lib';
</script>

<button onclick={() => pushState('', { foo: new Foo('it works?') })}>do the thing</button>

<p>foo: {page.state.foo?.bar() ?? 'nope'}</p>
