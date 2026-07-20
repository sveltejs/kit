<script>
	import { refreshAll } from '$app/navigation';
	let { children } = $props();
</script>

<nav>
	<a href="/load/invalidation/during-navigation/a" data-testid="nav-a">a</a>
	<a href="/load/invalidation/during-navigation/b" data-testid="nav-b">b</a>
	<a
		href="/load/invalidation/during-navigation/b"
		data-testid="nav-b-refresh"
		onclick={() => setTimeout(() => refreshAll(), 50)}
	>
		b+refresh
	</a>
	<a
		href="/load/invalidation/during-navigation/a"
		data-testid="nav-a-refresh"
		onclick={() => setTimeout(() => refreshAll(), 50)}
	>
		a+refresh
	</a>
</nav>

{@render children()}
