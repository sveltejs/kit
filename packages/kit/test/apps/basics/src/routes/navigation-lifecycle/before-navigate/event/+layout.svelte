<script>
	import { beforeNavigate } from '$app/navigation';

	let { children } = $props();

	beforeNavigate((navigation) => {
		if (navigation.type === 'link' || navigation.type === 'popstate') {
			console.log(
				`${navigation.event.type} ${navigation.from.url.pathname} -> ${navigation.to.url.pathname}`
			);
		}
	});
</script>

<a href="/navigation-lifecycle/before-navigate/event/a">a</a>
<a href="/navigation-lifecycle/before-navigate/event/b">b</a>

{@render children()}
