<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { Foo } from '$lib';
</script>

<button
	onclick={() => {
		const state = $state({ foo: new Foo('it works?'), count: 0 });
		pushState('', state);
	}}>push state</button
>

<!-- Make sure that page.state.count loses its reactivity -->
<button
	onclick={() => {
		page.state.count++;
	}}
>
	bump count
</button>

<p data-testid="foo">foo: {page.state.foo?.bar() ?? 'nope'}</p>
<p data-testid="count">count: {page.state.count ?? 'nope'}</p>
