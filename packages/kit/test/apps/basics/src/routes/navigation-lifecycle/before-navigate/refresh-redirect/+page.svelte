<script>
	import { beforeNavigate, refreshAll } from '$app/navigation';
	import { flags } from './flags.js';

	let times_triggered = $state(0);
	/** @type {string | undefined} */
	let navigation_type = $state();

	beforeNavigate(({ cancel, type }) => {
		times_triggered++;
		navigation_type = type;
		cancel();
	});
</script>

<h1>refresh redirect</h1>
<button
	onclick={() => {
		flags.redirect = true;
		refreshAll();
	}}>refresh</button
>
<pre>{times_triggered} {navigation_type}</pre>
