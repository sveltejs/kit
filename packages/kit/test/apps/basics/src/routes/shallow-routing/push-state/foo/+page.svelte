<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Foo } from '#lib';
</script>

<button
	data-id="shallow"
	onclick={() => {
		const state = $state({ foo: new Foo('it works?'), count: 0 });
		void goto('', { shallow: true, state });
	}}>add state</button
>

<button
	data-id="full"
	onclick={() => {
		const state = $state({ foo: new Foo('it works?'), count: 0 });
		void goto('', { state });
	}}>add state with navigation</button
>

<button onclick={() => (page.state.count = (page.state.count ?? 0) + 1)}>bump count</button>

<p data-testid="foo">foo: {page.state.foo?.bar() ?? 'nope'}</p>
<p data-testid="count">count: {page.state.count ?? 'nope'}</p>
