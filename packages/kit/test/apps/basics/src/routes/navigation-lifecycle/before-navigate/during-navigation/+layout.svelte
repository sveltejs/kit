<script>
	import { beforeNavigate, disableScrollHandling, onNavigate } from '$app/navigation';
	import { navigating } from '$app/state';
	import * as gate from './gate.js';

	let { children } = $props();

	const base = '/navigation-lifecycle/before-navigate/during-navigation';

	let times_triggered = $state(0);
	/** @type {string | undefined} */
	let navigation_type = $state();
	/** @type {Record<string, string>} */
	let status = $state({});
	let scroll_handling = $state('');

	// lets `b` and `c` through, cancels everything else, and records how `b` and `c` end
	beforeNavigate(({ cancel, type, to, complete }) => {
		times_triggered++;
		navigation_type = type;

		const target =
			to?.url.pathname === `${base}/b` ? 'b' : to?.url.pathname === `${base}/c` ? 'c' : null;
		if (target) {
			complete.then(
				() => (status[target] = 'complete'),
				() => (status[target] = 'aborted')
			);
		} else {
			cancel();
		}
	});

	onNavigate(({ to }) => {
		if (to?.url.pathname === `${base}/c`) return gate.c.released;
	});
</script>

<a href="{base}/b">b</a>
<a href="{base}/c">c</a>
<a href="/navigation-lifecycle/before-navigate/a">a</a>
<a href="{base}/slow-route">slow route</a>
<button id="release-b" onclick={() => gate.b.release()}>release b</button>
<button id="release-c" onclick={() => gate.c.release()}>release c</button>
<button
	id="disable-scroll-handling"
	onclick={() => {
		try {
			disableScrollHandling();
			scroll_handling = 'allowed';
		} catch {
			scroll_handling = 'threw';
		}
	}}>disable scroll handling</button
>
<pre>{times_triggered} {navigation_type}</pre>
<p id="navigating">{navigating.to?.url.pathname ?? 'idle'}</p>
<p id="b">{status.b ?? ''}</p>
<p id="c">{status.c ?? ''}</p>
<p id="scroll-handling">{scroll_handling}</p>

{@render children()}
