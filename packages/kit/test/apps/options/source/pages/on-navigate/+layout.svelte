<script>
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.willUnload) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
				console.log('navigated');
			});
		});
	});
</script>

<ul>
	<li><a href={resolve('/on-navigate/a')}>a</a></li>
	<li><a href={resolve('/on-navigate/b')}>b</a></li>
</ul>

{@render children()}
