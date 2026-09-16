<script>
	import { beforeNavigate } from '$app/navigation';
	import { navigating } from '$app/state';

	beforeNavigate((navigation) => {
		(window.before_navigate_calls ??= []).push(navigation.to?.url.pathname ?? null);
	});
</script>

<nav>
	<a href="/state/navigating/a">a</a>
	<a href="/state/navigating/b">b</a>
	<a href="/state/navigating/c">c</a>
	<a href="#deep">deep</a>
</nav>

<div id="nav-status">
	{#if navigating.to}
		<!-- prettier-ignore -->
		<p id="navigating">
			navigating from {navigating.from?.url.pathname} to {navigating.to.url.pathname} ({navigating.type})
		</p>
	{:else}
		<p id="not-navigating">not currently navigating</p>
	{/if}
</div>

<slot />
