<script>
	import { invalidateAll } from '$app/navigation';
	let { children } = $props();
</script>

<nav>
	<a href="/load/invalidation/during-navigation/a" data-testid="nav-a">a</a>
	<a href="/load/invalidation/during-navigation/b" data-testid="nav-b">b</a>
	<a
		href="/load/invalidation/during-navigation/b"
		data-testid="nav-b-invalidate"
		onclick={() => setTimeout(() => invalidateAll(), 50)}
	>
		b+invalidate
	</a>
	<a
		href="/load/invalidation/during-navigation/a"
		data-testid="nav-a-invalidate"
		onclick={() => setTimeout(() => invalidateAll(), 50)}
	>
		a+invalidate
	</a>
</nav>

{@render children()}
