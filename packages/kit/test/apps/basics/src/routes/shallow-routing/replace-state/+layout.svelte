<script>
	import { afterNavigate, beforeNavigate, onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		window.shallow_navigation_log = [];
	});

	beforeNavigate((navigation) => {
		if (navigation.shallow) {
			window.shallow_navigation_log.push({
				hook: 'before',
				shallow: navigation.shallow,
				type: navigation.type
			});
		}
	});

	onNavigate((navigation) => {
		if (navigation.shallow) {
			window.shallow_navigation_log.push({
				hook: 'on',
				shallow: navigation.shallow,
				type: navigation.type
			});
		}
	});

	afterNavigate((navigation) => {
		if (navigation.shallow) {
			window.shallow_navigation_log.push({
				hook: 'after',
				shallow: navigation.shallow,
				type: navigation.type
			});
		}
	});
</script>

<a href="/shallow-routing/replace-state">replace-state</a>
<a href="/shallow-routing/replace-state/a">a</a>
<a href="/shallow-routing/replace-state/b">b</a>

<slot />
