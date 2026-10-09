<script>
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		window.held_navigations = [];
		window.after_navigate_log = [];
	});

	// hold every navigation until the test releases it, as a view transition would,
	// then register a function to run once the navigation has completed
	onNavigate((navigation) => {
		return new Promise((fulfil) => {
			window.held_navigations.push(() =>
				fulfil(() => window.after_navigate_log.push(navigation.to?.url.pathname ?? ''))
			);
		});
	});
</script>

<h1>{data.id}</h1>
<a href="/navigation-lifecycle/on-navigate-superseded/a">a</a>
<a href="/navigation-lifecycle/on-navigate-superseded/b">b</a>
<button
	onclick={() =>
		void goto('/navigation-lifecycle/on-navigate-superseded/shallow', {
			shallow: true,
			state: { active: true }
		})}>shallow</button
>
<p data-testid="state">{page.state.active ? 'active' : 'inactive'}</p>
