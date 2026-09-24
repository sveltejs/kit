<script>
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		window.held_navigations = [];
	});

	// hold every navigation until the test releases it, as a view transition would
	onNavigate(() => {
		return new Promise((fulfil) => {
			window.held_navigations.push(fulfil);
		});
	});
</script>

<h1>{data.id}</h1>
<a href="/navigation-lifecycle/on-navigate-superseded/a">a</a>
<a href="/navigation-lifecycle/on-navigate-superseded/b">b</a>
