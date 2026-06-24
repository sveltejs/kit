<script>
	import { get_data } from './data.remote.js';

	const result = get_data();
</script>

<button
	id="deny-btn"
	onclick={() => {
		document.cookie = 'deny-remote=1; path=/';
		result.refresh();
	}}>Deny and refresh</button
>

<button
	id="clear-btn"
	onclick={() => {
		document.cookie = 'deny-remote=0; path=/; max-age=0';
	}}>Clear cookie</button
>

{#if result.error}
	<p id="status">{result.error.status}</p>
{:else if result.current !== undefined}
	<p id="value">{result.current}</p>
{/if}
