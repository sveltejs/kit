<script>
	import { navigation_count, pending_count } from './lifetime.remote.js';

	let { children } = $props();
	let show_pending = $state(false);

	const nav = navigation_count();
</script>

<nav>
	<a href="/remote/lifetime">lifetime home</a>
	<a href="/remote/lifetime/other">lifetime other</a>
</nav>

<p id="navigation-count">{await nav}</p>

<button id="start-pending" onclick={() => (show_pending = true)}>start pending query</button>
{#if show_pending}
	<p id="pending-count">{await pending_count()}</p>
{/if}

{@render children()}
