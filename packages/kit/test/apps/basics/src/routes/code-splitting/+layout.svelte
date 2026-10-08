<script>
	import { version } from '$app/env';
	import { updated } from '$app/state';
	import { go, PUBLIC_DYNAMIC } from '#lib/nav.js';

	let { children } = $props();
	let checked = $state('');
</script>

<p id="version">{String(version)}</p>
<p id="updated">{String(updated.current)}</p>
<p id="dynamic-public">{PUBLIC_DYNAMIC}</p>
<p id="checked">{checked}</p>
<button id="go" onclick={() => go('/code-splitting/other')}>go</button>
<button id="check" onclick={async () => (checked = String(await updated.check()))}>check</button>

{@render children()}
