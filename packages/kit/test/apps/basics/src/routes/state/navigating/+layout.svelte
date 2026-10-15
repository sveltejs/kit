<script>
	import { navigating } from '$app/state';

	/** @type {boolean | null} */
	let seen_shallow = $state(null);
	/** @type {string | null} */
	let seen_event = $state(null);

	$effect(() => {
		if (navigating.to) {
			seen_shallow = navigating.shallow;
			seen_event = navigating.event ? navigating.event.type : 'none';
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
		<p id="navigating-shallow">{navigating.shallow}</p>
		<p id="navigating-event">{navigating.event ? navigating.event.type : 'none'}</p>
	{:else}
		<p id="not-navigating">not currently navigating</p>
	{/if}
</div>

<p id="seen-shallow">{seen_shallow}</p>
<p id="seen-event">{seen_event}</p>

<slot />
