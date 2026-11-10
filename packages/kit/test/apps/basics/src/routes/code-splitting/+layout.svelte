<script>
	import { version } from '$app/env';
	import { go } from '#lib/nav.js';

	let { children } = $props();
</script>

<p id="version">{String(version)}</p>
<button onclick={() => go('/code-splitting/other')}>go</button>

{@render children()}
