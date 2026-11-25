<script>
	import { navigating } from '$app/state';
	import { beforeNavigate, goto } from '$app/navigation';

	/** @type {Event | undefined} */
	let event;
	let metadata = $state('');
	let { children } = $props();

	beforeNavigate((navigation) => {
		event = 'event' in navigation ? navigation.event : undefined;
	});

	$effect(() => {
		if (navigating.type) {
			const navigation_event = 'event' in navigating ? navigating.event : undefined;
			metadata = `${navigating.type} ${navigating.shallow} ${navigation_event?.type} ${navigation_event === event}`;
		}
	});
</script>

<nav>
	<a href="/state/navigating/a">a</a>
	<a href="/state/navigating/b">b</a>
	<a href="/state/navigating/c">c</a>
	<a href="#hash">hash</a>
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

<button onclick={() => goto('?x=1', { shallow: true, state: {} })}>shallow goto</button>
<button onclick={() => goto('/state/navigating/b')}>goto</button>
<form action="/state/navigating/a">
	<button>submit</button>
</form>

<p id="navigation-metadata">{metadata}</p>
<p id="navigation-idle">
	{String(navigating.shallow)}
	{String('event' in navigating ? navigating.event : undefined)}
</p>

{@render children()}
