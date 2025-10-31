<script lang="ts">
	import { get_delayed, increment } from './test.remote';

	const delayed = get_delayed();

	$inspect(delayed === get_delayed());
</script>

<svelte:boundary><p>awaited: {await delayed}</p></svelte:boundary>
<p>current: {delayed.current}</p>
<p>loading: {delayed.loading}</p>
<p>ready: {delayed.ready}</p>
<p>error: {delayed.error}</p>
<button onclick={() => increment().updates(get_delayed().withOverride((num) => num + 1))}
	>Increment</button
>
{delayed === get_delayed()}
